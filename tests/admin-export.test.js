const test = require('node:test');
const assert = require('node:assert/strict');
const { toCsv } = require('../dist/common/utils/csv.util');
const { adminBooleanStatusListQuerySchema, adminBookingListQuerySchema } = require('../dist/validators/admin');

test('CSV export includes UTF-8 BOM, headers, and escaped fields', () => {
  const csv = toCsv(['Name', 'Note'], [['Salon, Delhi', 'He said "hello"\nnext']]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(csv, /Name,Note/);
  assert.match(csv, /"Salon, Delhi","He said ""hello""\nnext"/);
});

test('Admin filter schemas combine location values and validate entity statuses', () => {
  const query = adminBooleanStatusListQuerySchema.parse({ country: 'India', city: 'Delhi', branchId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', status: 'ACTIVE', page: '2', limit: '25' });
  assert.equal(query.city, 'Delhi');
  assert.equal(query.status, 'ACTIVE');
  assert.equal(query.page, 2);
  assert.throws(() => adminBooleanStatusListQuerySchema.parse({ status: 'CONFIRMED' }));
  assert.throws(() => adminBookingListQuerySchema.parse({ status: 'ACTIVE' }));
  assert.equal(adminBookingListQuerySchema.parse({ status: 'CONFIRMED' }).status, 'CONFIRMED');
  assert.equal(adminBookingListQuerySchema.parse({ source: 'APP' }).source, 'APP');
  assert.equal(adminBookingListQuerySchema.parse({ source: 'WEB' }).source, 'WEB');
  assert.throws(() => adminBookingListQuerySchema.parse({ source: 'MOBILE' }));
});

test('CSV export handles null and undefined values', () => {
  assert.equal(toCsv(['A', 'B'], [[null, undefined]]), '\ufeffA,B\r\n,\r\n');
});
