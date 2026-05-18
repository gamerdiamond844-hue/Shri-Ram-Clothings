const axios = require('axios');
const url = 'https://staging-express.delhivery.com/api/cmu/create.json';
const token = '76c11fb43a4500513a4343c3efc6485786086c93';
const shipment = {
  shipments:[{
    name:'Test', add:'Test address', pin:'392001', city:'Bharuch', state:'Gujrat', country:'India', phone:'9999999999', order:'TEST123', payment_mode:'COD',
    return_pin:'392001', return_city:'Bharuch', return_state:'Gujrat', return_phone:'9999999999', return_name:'Test', return_add:'Test address', return_country:'India',
    products_desc:'Test', hsn_code:'', cod_amount:'100', order_date:'2026-05-18', total_amount:'100', seller_add:'Test address', seller_name:'Test', seller_inv:'TEST123',
    quantity:'1', weight:'0.5', shipment_width:'10', shipment_height:'10', shipment_length:'10', seller_gst_tin:'', shipping_mode:'Surface', address_type:'home',
    pickup_location:'Primary', pickup_date:{start_date:'2026-05-18',end_date:'2026-05-18'}, pickup_time:{start_time:'09:00:00',end_time:'18:00:00'},
    pickup_date_start:'2026-05-18', pickup_date_end:'2026-05-18', pickup_start_time:'09:00:00', pickup_end_time:'18:00:00'
  }],
  pickup_location:'Primary', pickup_date:{start_date:'2026-05-18', end_date:'2026-05-18'}, pickup_time:{start_time:'09:00:00', end_time:'18:00:00'},
  pickup_date_start:'2026-05-18', pickup_date_end:'2026-05-18', pickup_start_time:'09:00:00', pickup_end_time:'18:00:00'
};
const form = new URLSearchParams();
form.set('format','json');
form.set('data', JSON.stringify(shipment));
axios.post(url, form.toString(), {headers:{Authorization:'Token '+token,'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'}, timeout:20000})
  .then(r=>console.log(JSON.stringify(r.data,null,2)))
  .catch(e=>{ if(e.response) console.log(JSON.stringify(e.response.data,null,2)); else console.error(e.message); });
