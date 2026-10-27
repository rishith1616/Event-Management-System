/**
 * tests/routes.test.js — End-to-end route tests for Payment API endpoints
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import paymentRoutes from '../routes/payments.js';
import errorHandler from '../middleware/errorHandler.js';

describe('Payment API Endpoints (Routes + Auth Middleware)', () => {
  let app;
  let server;
  let baseUrl;

  before(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/payments', paymentRoutes);
    app.use(errorHandler);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api/payments`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('POST /api/payments/process rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${baseUrl}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 50, token: 'mock_token' }),
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.message, /No authorization token provided/);
  });

  test('POST /api/payments/process succeeds with valid bearer token', async () => {
    const res = await fetch(`${baseUrl}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-user-token',
      },
      body: JSON.stringify({ amount: 100, currency: 'USD', token: 'mock_token' }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.match(data.transactionId, /^txn_mock_/);
  });

  test('GET /api/payments/provider-info rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${baseUrl}/provider-info`);
    assert.equal(res.status, 401);
  });

  test('GET /api/payments/provider-info rejects non-admin users with 403', async () => {
    const res = await fetch(`${baseUrl}/provider-info`, {
      headers: { Authorization: 'Bearer mock-user-token' },
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.message, /Administrator privileges required/);
  });

  test('GET /api/payments/provider-info allows admin users with 200', async () => {
    const res = await fetch(`${baseUrl}/provider-info`, {
      headers: { Authorization: 'Bearer mock-admin-token' },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.activeProvider);
    assert.ok(Array.isArray(data.supportedProviders));
  });
});
