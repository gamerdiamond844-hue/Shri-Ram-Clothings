const axios = require('axios');

const BASE = process.env.DELHIVERY_MODE === 'production'
  ? 'https://track.delhivery.com'
  : 'https://staging-express.delhivery.com';

const TOKEN = process.env.DELHIVERY_API_TOKEN;

const client = axios.create({
  baseURL: BASE,
  headers: {
    Authorization: `Token ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ── Create shipment (generate AWB) ───────────────────────────────────────────
const createShipment = async (order) => {
  const payload = {
    format: 'json',
    data: JSON.stringify({
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
        seller_gst_tin: process.env.DELHIVERY_GST || '',
        shipping_mode: 'Surface',
        address_type: 'home',
      }],
      pickup_location: { name: process.env.DELHIVERY_PICKUP_NAME || 'Primary' },
    }),
  };

  const res = await client.post('/api/cmu/create.json', payload, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const pkg = res.data?.packages?.[0];
  if (!pkg) throw new Error('No package returned from Delhivery');
  if (pkg.status === 'Error') throw new Error(pkg.error_message || 'Delhivery error');

  return {
    awb: pkg.waybill,
    courier: 'Delhivery',
    status: 'processing',
  };
};

// ── Track shipment ────────────────────────────────────────────────────────────
const trackShipment = async (awb) => {
  const res = await client.get(`/api/v1/packages/json/?waybill=${awb}&verbose=true`);
  const data = res.data;
  if (!data?.ShipmentData?.length) return null;

  const shipment = data.ShipmentData[0].Shipment;
  const scans = shipment.Scans || [];

  return {
    awb,
    status: shipment.Status?.Status || 'processing',
    statusCode: shipment.Status?.StatusCode || '',
    location: shipment.Status?.StatusLocation || '',
    estimatedDelivery: shipment.ExpectedDeliveryDate || null,
    scans: scans.map(s => ({
      status: s.ScanDetail?.Scan || '',
      location: s.ScanDetail?.ScannedLocation || '',
      timestamp: s.ScanDetail?.ScanDateTime || '',
      instructions: s.ScanDetail?.Instructions || '',
    })).reverse(),
  };
};

// ── Cancel shipment ───────────────────────────────────────────────────────────
const cancelShipment = async (awb) => {
  const res = await client.post('/api/p/edit', {
    waybill: awb,
    cancellation: true,
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
