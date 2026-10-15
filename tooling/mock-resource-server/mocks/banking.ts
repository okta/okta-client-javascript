import { Router } from 'express';
import { Faker, en } from '@faker-js/faker';

type AccountType = 'checking' | 'savings' | 'credit';

interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
}

interface Profile {
  id: string;
  name: string;
  email: string;
}

// Separate seeded instance so this stable banking data doesn't consume
// (and perturb) the shared `faker` singleton used for unseeded /api/messages.
const seededFaker = new Faker({ locale: [en] });
seededFaker.seed(42);

function generateBankingData () {
  const profile: Profile = {
    id: seededFaker.string.uuid(),
    name: seededFaker.person.fullName(),
    email: seededFaker.internet.email(),
  };

  const accounts: Account[] = Array.from({ length: 3 }, () => ({
    id: seededFaker.string.uuid(),
    name: seededFaker.finance.accountName(),
    type: seededFaker.helpers.arrayElement<AccountType>(['checking', 'savings', 'credit']),
    balance: Number(seededFaker.finance.amount({ min: 100, max: 50000, dec: 2 })),
    currency: 'USD',
  }));

  const transactions: Record<string, Transaction[]> = {};
  accounts.forEach((account) => {
    transactions[account.id] = Array.from(
      { length: seededFaker.number.int({ min: 5, max: 20 }) },
      () => ({
        id: seededFaker.string.uuid(),
        accountId: account.id,
        date: seededFaker.date.recent({ days: 60 }).toISOString(),
        description: seededFaker.finance.transactionDescription(),
        amount: Number(seededFaker.finance.amount({ min: -500, max: 500, dec: 2 })),
      })
    );
  });

  return { profile, accounts, transactions };
}

// Generated once at module load (server startup); kept in memory for the process lifetime.
const data = generateBankingData();

export const bankingRouter = Router();

bankingRouter.get('/banking/profile', (req, res) => {
  res.json(data.profile);
});

bankingRouter.get('/banking/accounts', (req, res) => {
  res.json(data.accounts);
});

bankingRouter.get('/banking/accounts/:id', (req, res) => {
  const account = data.accounts.find((a) => a.id === req.params.id);
  if (!account) {
    res.statusCode = 404;
    res.json({ error: 'Account not found' });
    return;
  }
  res.json(account);
});

bankingRouter.get('/banking/accounts/:id/transactions', (req, res) => {
  const txns = data.transactions[req.params.id];
  if (!txns) {
    res.statusCode = 404;
    res.json({ error: 'Account not found' });
    return;
  }
  res.json(txns);
});
