import { ResultAsync } from 'neverthrow';
import type { Config } from '../config.js';
import { otpError, type OtpError } from '../errors.js';
import { getLogger } from '../logger.js';

const OTP_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 5_000;
const OTP_REGEX = /\b(\d{6})\b/;
const MESSAGE_LOOKBACK_MS = 5 * 60 * 1000;

interface BlueBubblesMessage {
  guid: string;
  text: string | null;
  dateCreated: number;
  isFromMe: boolean;
  handle?: {
    address: string;
    service: string;
  };
}

interface BlueBubblesResponse {
  status: number;
  message: string;
  data: BlueBubblesMessage[];
}

async function fetchRecentMessages(config: Config): Promise<BlueBubblesMessage[]> {
  const url = new URL('/api/v1/message/query', config.blueBubblesUrl);
  url.searchParams.set('password', config.blueBubblesPassword ?? '');

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      limit: 20,
      sort: 'DESC',
    }),
  });

  if (!response.ok) {
    throw new Error(`BlueBubbles API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as BlueBubblesResponse;

  if (data.status !== 200) {
    throw new Error(`BlueBubbles API error: ${data.message}`);
  }

  return data.data;
}

function extractOtpFromMessages(
  messages: BlueBubblesMessage[],
  sinceTimestamp: number
): string | null {
  const log = getLogger();

  for (const msg of messages) {
    if (msg.isFromMe) continue;

    if (msg.dateCreated < sinceTimestamp) continue;

    const match = OTP_REGEX.exec(msg.text || '');
    if (match) {
      log.debug(
        {
          code: match[1],
          from: msg.handle?.address,
          date: new Date(msg.dateCreated),
        },
        'Found OTP code in SMS'
      );
      return match[1];
    }
  }

  return null;
}

export function fetchOtpFromBlueBubbles(config: Config): ResultAsync<string, OtpError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      log.info('Waiting for OTP SMS via BlueBubbles...');

      const startTime = Date.now();
      const sinceTimestamp = startTime - MESSAGE_LOOKBACK_MS;
      const deadline = startTime + OTP_TIMEOUT_MS;

      while (Date.now() < deadline) {
        try {
          const messages = await fetchRecentMessages(config);
          const code = extractOtpFromMessages(messages, sinceTimestamp);

          if (code) {
            log.info('OTP code received from BlueBubbles');
            return code;
          }

          log.debug('No new OTP SMS found, polling...');
        } catch (e) {
          log.warn({ error: e }, 'Error polling BlueBubbles, retrying...');
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      throw new Error('Timeout waiting for OTP SMS');
    })(),
    (e) =>
      otpError(
        e instanceof Error ? e.message : 'Failed to fetch OTP from BlueBubbles',
        'bluebubbles',
        e
      )
  );
}

export function promptOtpFromTty(): ResultAsync<string, OtpError> {
  return ResultAsync.fromPromise(
    new Promise<string>((resolve, reject) => {
      const log = getLogger();
      log.info('Please enter the OTP code:');

      if (!process.stdin.isTTY) {
        reject(new Error('No TTY available for OTP input'));
        return;
      }

      process.stdout.write('OTP> ');

      import('readline')
        .then((readline) => {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const timeout = setTimeout(() => {
            rl.close();
            reject(new Error('Timeout waiting for TTY input'));
          }, 120_000);

          rl.on('line', (line: string) => {
            clearTimeout(timeout);
            rl.close();

            const code = line.trim();
            const match = OTP_REGEX.exec(code);

            if (match) {
              resolve(match[1]);
            } else {
              reject(new Error(`Invalid OTP code: ${code}`));
            }
          });
        })
        .catch(reject);
    }),
    (e) => otpError(e instanceof Error ? e.message : 'Failed to read OTP from TTY', 'tty', e)
  );
}
