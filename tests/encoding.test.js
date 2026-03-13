const { createPayload, validatePayload } = require('../shared/schema');
const { encodePayload, decodePayload, generateShareURL, decodeFromHash } = require('../shared/compress');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function test(name, fn) {
  console.log(`\n  ${name}`);
  fn();
}

// --- Schema Tests ---

test('createPayload creates valid payload', () => {
  const items = [
    { name: 'Semi-Skimmed Milk 2 Pints', quantity: 2, sku: '12345' },
    { name: 'Hovis Wholemeal Bread 800g', quantity: 1, sku: '67890' },
  ];
  const payload = createPayload(items, 'Weekly Shop');

  assert(payload.v === 1, 'version should be 1');
  assert(payload.n === 'Weekly Shop', 'name should match');
  assert(typeof payload.t === 'number', 'timestamp should be a number');
  assert(payload.i.length === 2, 'should have 2 items');
  assert(payload.i[0].n === 'Semi-Skimmed Milk 2 Pints', 'item name should match');
  assert(payload.i[0].q === 2, 'item quantity should match');
  assert(payload.i[0].s === '12345', 'item SKU should match');
});

test('createPayload truncates long names', () => {
  const longName = 'A'.repeat(100);
  const payload = createPayload([{ name: longName, quantity: 1 }]);
  assert(payload.i[0].n.length === 80, 'name should be truncated to 80 chars');
});

test('createPayload defaults quantity to 1', () => {
  const payload = createPayload([{ name: 'Test Item' }]);
  assert(payload.i[0].q === 1, 'quantity should default to 1');
});

test('createPayload omits SKU if not provided', () => {
  const payload = createPayload([{ name: 'Test Item', quantity: 1 }]);
  assert(payload.i[0].s === undefined, 'SKU should be undefined');
});

test('validatePayload accepts valid payload', () => {
  const payload = createPayload([{ name: 'Milk', quantity: 2, sku: '123' }], 'Test');
  const result = validatePayload(payload);
  assert(result.valid === true, 'should be valid');
});

test('validatePayload rejects empty items', () => {
  const result = validatePayload({ v: 1, n: '', t: 0, i: [] });
  assert(result.valid === false, 'should be invalid');
  assert(result.error.includes('no items'), 'should mention no items');
});

test('validatePayload rejects future version', () => {
  const result = validatePayload({ v: 99, n: '', t: 0, i: [{ n: 'X', q: 1 }] });
  assert(result.valid === false, 'should be invalid');
  assert(result.error.includes('newer version'), 'should mention newer version');
});

test('validatePayload rejects missing name', () => {
  const result = validatePayload({ v: 1, n: '', t: 0, i: [{ n: '', q: 1 }] });
  assert(result.valid === false, 'should be invalid');
});

test('validatePayload rejects invalid quantity', () => {
  const result = validatePayload({ v: 1, n: '', t: 0, i: [{ n: 'X', q: 0 }] });
  assert(result.valid === false, 'should be invalid');
});

// --- Compression Tests ---

test('encodePayload/decodePayload roundtrip', () => {
  const payload = createPayload([
    { name: 'Semi-Skimmed Milk 2 Pints', quantity: 2, sku: '12345' },
    { name: 'Hovis Wholemeal Bread 800g', quantity: 1, sku: '67890' },
  ], 'Weekly Shop');

  const compressed = encodePayload(payload);
  const decoded = decodePayload(compressed);

  assert(decoded !== null, 'decoded should not be null');
  assert(decoded.v === payload.v, 'version should match');
  assert(decoded.n === payload.n, 'name should match');
  assert(decoded.i.length === payload.i.length, 'item count should match');
  assert(decoded.i[0].n === payload.i[0].n, 'first item name should match');
  assert(decoded.i[0].s === payload.i[0].s, 'first item SKU should match');
});

test('generateShareURL creates valid URL', () => {
  const payload = createPayload([{ name: 'Milk', quantity: 1 }]);
  const url = generateShareURL(payload, 'https://example.com/share');
  assert(url.startsWith('https://example.com/share/#'), 'URL should start with base URL');
  assert(url.length > 30, 'URL should have compressed data');
});

test('decodeFromHash roundtrip with generateShareURL', () => {
  const payload = createPayload([
    { name: 'Bananas', quantity: 5 },
    { name: 'Apples', quantity: 3 },
  ], 'Fruit');

  const url = generateShareURL(payload, 'https://example.com');
  const hash = url.split('#')[1];
  const decoded = decodeFromHash(hash);

  assert(decoded.n === 'Fruit', 'list name should match');
  assert(decoded.i.length === 2, 'should have 2 items');
  assert(decoded.i[0].n === 'Bananas', 'first item should be Bananas');
  assert(decoded.i[1].q === 3, 'second item quantity should be 3');
});

test('decodeFromHash handles leading #', () => {
  const payload = createPayload([{ name: 'Test', quantity: 1 }]);
  const compressed = encodePayload(payload);
  const decoded = decodeFromHash('#' + compressed);
  assert(decoded !== null, 'should decode with leading #');
  assert(decoded.i[0].n === 'Test', 'item should match');
});

test('decodePayload returns null for garbage input', () => {
  assert(decodePayload('garbage!!!') === null, 'should return null');
  assert(decodePayload('') === null, 'should return null for empty');
});

// --- Compression Size Tests ---

function generateSampleItems(count) {
  const products = [
    'Semi-Skimmed Milk 2 Pints', 'Hovis Wholemeal Bread 800g',
    'Bananas Loose', 'Cathedral City Mature Cheddar 350g',
    'Free Range Large Eggs x6', 'Lurpak Slightly Salted Butter 250g',
    'Heinz Baked Beanz 415g', 'Warburtons Toastie White Bread 800g',
    'Tesco British Chicken Breast Fillets 300g', 'Muller Corner Strawberry Yogurt 136g',
    'Birds Eye Garden Peas 800g', 'McVities Chocolate Digestives 266g',
    'Kenco Rich Instant Coffee 100g', 'PG Tips Original Tea Bags x80',
    'Fairy Original Washing Up Liquid 900ml',
  ];
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      name: products[i % products.length],
      quantity: Math.floor(Math.random() * 5) + 1,
      sku: String(10000 + i),
    });
  }
  return items;
}

for (const size of [5, 20, 30, 50, 100]) {
  test(`compression size for ${size} items`, () => {
    const items = generateSampleItems(size);
    const payload = createPayload(items, `Test List (${size} items)`);
    const compressed = encodePayload(payload);
    const json = JSON.stringify(payload);

    const ratio = ((1 - compressed.length / json.length) * 100).toFixed(1);
    console.log(`    JSON: ${json.length} chars → Compressed: ${compressed.length} chars (${ratio}% reduction)`);

    const url = generateShareURL(payload, 'https://example.github.io/ocado-list-share');
    console.log(`    Full URL: ${url.length} chars`);

    assert(url.length < 8000, `URL should be under 8000 chars (got ${url.length})`);

    // Verify roundtrip
    const hash = url.split('#')[1];
    const decoded = decodeFromHash(hash);
    assert(decoded.i.length === size, `should decode all ${size} items`);
  });
}

// --- Summary ---
console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
