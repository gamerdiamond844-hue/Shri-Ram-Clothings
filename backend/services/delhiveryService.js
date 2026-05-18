const axios = require('axios');

const BASE = process.env.DELHIVERY_MODE === 'production'
  ? 'https://track.delhivery.com'
  : 'https://staging-express.delhivery.com';

const TOKEN = process.env.DELHIVERY_API_TOKEN;

const assertConfigured = () => {
  if (!TOKEN || TOKEN === 'undefined') {
    throw new Error('DELHIVERY_API_TOKEN is missing. Set it in your .env file.');
  }
};

const client = axios.create({
  baseURL: BASE,
  headers: {
    Authorization: `Token ${TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

const getFirstItem = (value) => {
  if (Array.isArray(value)) return value[0];
  if (value && typeof value === 'object') return value;
  return null;
};

const normalizePackage = (data) => {
  if (data === true || data === 'true') return null;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (err) { return null; }
  }
  if (!data || typeof data !== 'object') return null;

  return getFirstItem(data.packages)
    || getFirstItem(data.data?.packages)
    || getFirstItem(data.package)
    || getFirstItem(data.data?.package)
    || getFirstItem(data.Response?.Packages?.Package)
    || getFirstItem(data.response?.Packages?.Package)
    || getFirstItem(data.Response?.Package)
    || getFirstItem(data.response?.Package)
    || getFirstItem(data.data?.Response?.Packages?.Package)
    || getFirstItem(data.data?.response?.Packages?.Package)
    || getFirstItem(data.data?.Response?.Package)
    || getFirstItem(data.data?.response?.Package)
    || null;
};

const normalizeShipmentData = (data) => {
  return data?.ShipmentData?.length ? data.ShipmentData
    : data?.shipmentData?.length ? data.shipmentData
    : data?.data?.ShipmentData?.length ? data.data.ShipmentData
    : data?.data?.shipmentData?.length ? data.data.shipmentData
    : null;
};

const cleanPayload = (obj) => Object.entries(obj).reduce((acc, [key, value]) => {
  if (value === undefined || value === null || value === '') return acc;
  if (Array.isArray(value) && value.length === 0) return acc;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const nested = cleanPayload(value);
    if (Object.keys(nested).length === 0) return acc;
    acc[key] = nested;
    return acc;
  }
  acc[key] = value;
  return acc;
}, {});

// ── Create shipment (generate AWB) ───────────────────────────────────────────
const createShipment = async (order) => {
  assertConfigured();

  const dataObj = {
    shipments: [{
      name: order.full_name,
      add: order.address,
      pin: order.pincode,
      city: order.city,
      state: order.state,
      country: 'India',
      phone: order.mobile,
      order: order.order_id,
      payment_mode: order.payment_status === 'paid' ? 'Prepaid' : 'COD',
      return_pin: process.env.DELHIVERY_RETURN_PINCODE || '110001',
      return_city: process.env.DELHIVERY_RETURN_CITY || 'Delhi',
      return_phone: process.env.DELHIVERY_RETURN_PHONE || '9999999999',
      return_name: 'Shri Ram Clothings',
      return_add: process.env.DELHIVERY_RETURN_ADDRESS || 'Return Address',
      return_state: process.env.DELHIVERY_RETURN_STATE || 'Delhi',
      return_country: 'India',
      products_desc: order.items?.map(i => i.title).join(', ') || 'Clothing',
      hsn_code: '',
      cod_amount: order.payment_status === 'paid' ? '0' : String(order.total),
      order_date: new Date(order.created_at).toISOString().split('T')[0],
      total_amount: String(order.total),
      seller_add: process.env.DELHIVERY_RETURN_ADDRESS || 'Return Address',
      seller_name: 'Shri Ram Clothings',
      seller_inv: order.order_id,
      quantity: String(order.items?.reduce((s, i) => s + i.quantity, 0) || 1),
      weight: '0.5',
      shipment_width: '15',
      shipment_height: '10',
      shipment_length: '20',
      seller_gst_tin: process.env.DELHIVERY_GST || undefined,
      shipping_mode: 'Surface',
      address_type: 'home',
    }],
    pickup_location: process.env.DELHIVERY_PICKUP_NAME || 'Primary',
    pickup_date: process.env.DELHIVERY_PICKUP_DATE || new Date().toISOString().split('T')[0],
    pickup_start_time: process.env.DELHIVERY_PICKUP_START_TIME || '09:00:00',
    pickup_end_time: process.env.DELHIVERY_PICKUP_END_TIME || '18:00:00',
  };

  const cleanedData = cleanPayload(dataObj);
  const form = new URLSearchParams();
  form.set('format', 'json');
  form.set('data', JSON.stringify(cleanedData));

  const res = await client.post('/api/cmu/create.json', form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const pkg = normalizePackage(res.data);
  if (!pkg) {
    const message = res.data === true || res.data === 'true'
      ? 'Unexpected boolean response from Delhivery'
      : res.data?.Error || res.data?.error || JSON.stringify(res.data || {});
    throw new Error(`No package returned from Delhivery: ${message}`);
  }
  if (pkg.status === 'Error' || pkg.status === 'error') {
    throw new Error(pkg.error_message || pkg.error || 'Delhivery error');
  }

  return {
    awb: pkg.waybill || pkg.waybill_number || pkg.awb || pkg.barcode,
    courier: 'Delhivery',
    status: 'processing',
  };
};

// ── Track shipment ────────────────────────────────────────────────────────────
const trackShipment = async (awb) => {
  assertConfigured();
  const res = await client.get(`/api/v1/packages/json/?waybill=${encodeURIComponent(awb)}&verbose=true`);
  const data = res.data;
  const shipmentData = normalizeShipmentData(data);
  if (!shipmentData) return null;

  const shipment = shipmentData[0].Shipment;
  const scans = shipment?.Scans || [];

  return {
    awb,
    status: shipment?.Status?.Status || shipment?.Status || 'processing',
    statusCode: shipment?.Status?.StatusCode || '',
    location: shipment?.Status?.StatusLocation || '',
    estimatedDelivery: shipment?.ExpectedDeliveryDate || null,
    scans: (scans || []).map(s => ({
      status: s.ScanDetail?.Scan || '',
      location: s.ScanDetail?.ScannedLocation || '',
      timestamp: s.ScanDetail?.ScanDateTime || '',
      instructions: s.ScanDetail?.Instructions || '',
    })).reverse(),
  };
};

// ── Cancel shipment ───────────────────────────────────────────────────────────
const cancelShipment = async (awb) => {
  assertConfigured();
  const form = new URLSearchParams();
  form.set('waybill', awb);
  form.set('cancellation', 'true');
  const res = await client.post('/api/p/edit', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data;
};

// ── Map Delhivery status to our internal stages ───────────────────────────────
const mapStatus = (delhiveryStatus) => {
  const s = (delhiveryStatus || '').toLowerCase();
  if (s.includes('delivered')) return 'delivered';
  if (s.includes('out for delivery') || s.includes('ofd')) return 'shipped';
  if (s.includes('in transit') || s.includes('transit')) return 'shipped';
  if (s.includes('picked up') || s.includes('pickup')) return 'processing';
  if (s.includes('manifested') || s.includes('booked')) return 'processing';
  if (s.includes('rto') || s.includes('return')) return 'refunded';
  if (s.includes('cancelled') || s.includes('cancel')) return 'cancelled';
  return 'processing';
};

module.exports = { createShipment, trackShipment, cancelShipment, mapStatus };
