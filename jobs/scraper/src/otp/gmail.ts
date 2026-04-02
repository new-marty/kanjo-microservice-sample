import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { ResultAsync } from 'neverthrow';
import type { Config } from '../config.js';
import { otpError, type OtpError } from '../errors.js';
import { getLogger } from '../logger.js';

const OTP_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 5_000;
const MF_SENDER = 'do_not_reply@moneyforward.com';
const OTP_REGEX = /\b(\d{6})\b/;

interface OtpResult {
  code: string;
  timestamp: Date;
}

async function connectImap(config: Config): Promise<ImapFlow> {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: config.gmailUser!,
      pass: config.gmailAppPassword!,
    },
    logger: false,
  });

  await client.connect();
  return client;
}

async function searchForOtp(client: ImapFlow, sinceTime: Date): Promise<OtpResult | null> {
  const log = getLogger();

  await client.mailboxOpen('INBOX');

  const messages = client.fetch(
    {
      from: MF_SENDER,
      since: sinceTime,
    },
    { source: true, envelope: true }
  );

  const candidates: Array<{ date: Date; source: Buffer }> = [];

  for await (const msg of messages) {
    if (msg.envelope?.date && msg.source) {
      candidates.push({
        date: msg.envelope.date,
        source: msg.source,
      });
    }
  }

  candidates.sort((a, b) => b.date.getTime() - a.date.getTime());

  for (const candidate of candidates) {
    const parsed = await simpleParser(candidate.source);
    const body = parsed.text || '';

    const match = OTP_REGEX.exec(body);
    if (match) {
      log.debug({ code: match[1] }, 'Found OTP code in email');
      return {
        code: match[1],
        timestamp: candidate.date,
      };
    }
  }

  return null;
}

export function fetchOtpFromGmail(config: Config): ResultAsync<string, OtpError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      log.info('Waiting for OTP email from MoneyForward...');

      // Look for emails from the last 3 minutes - OTP should arrive very quickly
      const sinceTime = new Date(Date.now() - 3 * 60 * 1000);

      let client: ImapFlow | null = null;
      let initialCode: string | null = null;

      try {
        client = await connectImap(config);

        const deadline = Date.now() + OTP_TIMEOUT_MS;
        let firstPoll = true;

        while (Date.now() < deadline) {
          const result = await searchForOtp(client, sinceTime);

          if (result) {
            if (firstPoll) {
              // On first poll, remember the code - it might be from a previous login
              initialCode = result.code;
              log.debug({ code: result.code }, 'Found initial OTP code');
              firstPoll = false;
            } else if (result.code !== initialCode) {
              // A different code appeared - this is the new one
              log.info({ code: result.code }, 'New OTP code received from Gmail');
              return result.code;
            }
          } else {
            firstPoll = false;
          }

          log.debug('Waiting for new OTP email...');
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }

        // If we found a code but no new one arrived, use what we have
        // (this handles the case where there was no previous OTP email)
        if (initialCode) {
          log.info({ code: initialCode }, 'Using OTP code from Gmail');
          return initialCode;
        }

        throw new Error('Timeout waiting for OTP email');
      } finally {
        if (client) {
          await client.logout().catch(() => {});
        }
      }
    })(),
    (e) => otpError(e instanceof Error ? e.message : 'Failed to fetch OTP from Gmail', 'gmail', e)
  );
}
