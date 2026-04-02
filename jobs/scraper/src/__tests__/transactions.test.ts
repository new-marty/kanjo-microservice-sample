import { describe, it, expect } from 'vitest';
import iconv from 'iconv-lite';
import { generateTransactionHash, parseTransactionsCsv } from '../mf/transactions.js';

describe('generateTransactionHash', () => {
  it('generates consistent hash for same input', () => {
    const tx = {
      date: new Date('2024-01-15'),
      amount: -1500,
      accountName: 'SBI証券',
      description: 'コンビニ購入',
    };

    const hash1 = generateTransactionHash(tx);
    const hash2 = generateTransactionHash(tx);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('generates different hashes for different inputs', () => {
    const tx1 = {
      date: new Date('2024-01-15'),
      amount: -1500,
      accountName: 'SBI証券',
      description: 'コンビニ購入',
    };

    const tx2 = {
      date: new Date('2024-01-15'),
      amount: -2000,
      accountName: 'SBI証券',
      description: 'コンビニ購入',
    };

    expect(generateTransactionHash(tx1)).not.toBe(generateTransactionHash(tx2));
  });
});

describe('parseTransactionsCsv', () => {
  const createCsvBuffer = (content: string): Buffer => {
    return iconv.encode(content, 'CP932');
  };

  it('parses valid CSV with all fields', () => {
    const csv = `日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替
2024/01/15,コンビニ購入,-1500,SBI証券,食費,食料品,テストメモ,0
2024/01/16,給与振込,300000,みずほ銀行,収入,給与,,0`;

    const buffer = createCsvBuffer(csv);
    const transactions = parseTransactionsCsv(buffer);

    expect(transactions).toHaveLength(2);

    expect(transactions[0]).toMatchObject({
      date: expect.any(Date) as unknown as Date,
      description: 'コンビニ購入',
      amount: -1500,
      accountName: 'SBI証券',
      category: '食費',
      subCategory: '食料品',
      memo: 'テストメモ',
      isTransfer: false,
    });
    expect(transactions[0].hash).toHaveLength(64);

    expect(transactions[1]).toMatchObject({
      description: '給与振込',
      amount: 300000,
      category: '収入',
    });
  });

  it('handles missing optional fields', () => {
    const csv = `日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替
2024/01/15,コンビニ,-500,銀行,食費,,,`;

    const buffer = createCsvBuffer(csv);
    const transactions = parseTransactionsCsv(buffer);

    expect(transactions).toHaveLength(1);
    expect(transactions[0].subCategory).toBeNull();
    expect(transactions[0].memo).toBeNull();
  });

  it('detects transfer transactions', () => {
    const csv = `日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替
2024/01/15,ATM引き出し,-10000,銀行,現金,,,0
2024/01/16,振込手数料,-220,銀行,手数料,,,0
2024/01/17,普通入金,5000,銀行,入金,,,1`;

    const buffer = createCsvBuffer(csv);
    const transactions = parseTransactionsCsv(buffer);

    expect(transactions[0].isTransfer).toBe(true);
    expect(transactions[1].isTransfer).toBe(true);
    expect(transactions[2].isTransfer).toBe(true);
  });

  it('skips rows with missing required fields', () => {
    const csv = `日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替
2024/01/15,コンビニ,-500,銀行,食費,,,
,missing date,-500,銀行,食費,,,
2024/01/16,missing amount,,銀行,食費,,,`;

    const buffer = createCsvBuffer(csv);
    const transactions = parseTransactionsCsv(buffer);

    expect(transactions).toHaveLength(1);
  });

  it('parses large amounts correctly', () => {
    const csv = `日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替
2024/01/15,大きな支出,-1234567,銀行,その他,,,`;

    const buffer = createCsvBuffer(csv);
    const transactions = parseTransactionsCsv(buffer);

    expect(transactions[0]?.amount).toBe(-1234567);
  });

  it('returns empty array for empty CSV', () => {
    const csv = `日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替`;
    const buffer = createCsvBuffer(csv);
    const transactions = parseTransactionsCsv(buffer);

    expect(transactions).toHaveLength(0);
  });
});
