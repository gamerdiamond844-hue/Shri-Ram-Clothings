const axios = require('axios');
const token = '76c11fb43a4500513a4343c3efc6485786086c93';
const url = 'https://staging-express.delhivery.com/api/cmu/create.json';
const baseShipment = {
  name:'Test',
  add:'Test address',
  pin:'392001',
  city:'Bharuch',
  state:'Gujrat',
  country:'India',
  phone:'9999999999',
  order:'TEST123',
  payment_mode:'COD',
  return_pin:'392001',
  return_city:'Bharuch',
  return_state:'Gujrat',
  return_phone:'9999999999',
  return_name:'Test',
  return_add:'Test address',
  return_country:'India',
  products_desc:'Test',
  hsn_code:'',
  cod_amount:'100',
  order_date:'2026-05-18',
  total_amount:'100',
  seller_add:'Test address',
  seller_name:'Test',
  seller_inv:'TEST123',
  quantity:'1',
  weight:'0.5',
  shipment_width:'10',
  shipment_height:'10',
  shipment_length:'10',
  seller_gst_tin:'',
  shipping_mode:'Surface',
  address_type:'home',
};
const payloads = [
  {
    name:'top-string',
    data:{
      shipments:[baseShipment],
      pickup_location:'Primary',
      pickup_date:'2026-05-18',
      pickup_start_time:'09:00:00',
      pickup_end_time:'18:00:00'
    }
  },
  {
    name:'top-object',
    data:{
      shipments:[baseShipment],
      pickup_location:'Primary',
      pickup_date:{start_date:'2026-05-18',end_date:'2026-05-18'},
      pickup_time:{start_time:'09:00:00',end_time:'18:00:00'}
    }
  },
  {
    name:'top-dateobj-top-timeobj',
    data:{
      shipments:[baseShipment],
      pickup_location:'Primary',
      pickup_date:{start_date:'2026-05-18',end_date:'2026-05-18'},
      pickup_start_time:'09:00:00',
      pickup_end_time:'18:00:00'
    }
  },
  {
    name:'ship-date-time-obj',
    data:{
      shipments:[Object.assign({},baseShipment,{
        pickup_date:{start_date:'2026-05-18',end_date:'2026-05-18'},
        pickup_time:{start_time:'09:00:00',end_time:'18:00:00'}
      })],
      pickup_location:'Primary'
    }
  },
  {
    name:'ship-date-obj-top-time-obj',
    data:{
      shipments:[Object.assign({},baseShipment,{pickup_date:{start_date:'2026-05-18',end_date:'2026-05-18'}})],
      pickup_location:'Primary',
      pickup_time:{start_time:'09:00:00',end_time:'18:00:00'}
    }
  },
  {
    name:'ship-date-obj-top-date-string',
    data:{
      shipments:[Object.assign({},baseShipment,{pickup_date:{start_date:'2026-05-18',end_date:'2026-05-18'}})],
      pickup_location:'Primary',
      pickup_date:'2026-05-18'
    }
  },
  {
    name:'ship-time-obj-top-date-string',
    data:{
      shipments:[Object.assign({},baseShipment,{pickup_time:{start_time:'09:00:00',end_time:'18:00:00'}})],
      pickup_location:'Primary',
      pickup_date:'2026-05-18'
    }
  }
];
(async()=>{
  for (const p of payloads) {
    const form = new URLSearchParams();
    form.set('format','json');
    form.set('data', JSON.stringify(p.data));
    try {
      const res = await axios.post(url, form.toString(), {
        headers:{Authorization:'Token '+token,'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},
        timeout:20000,
      });
      console.log('===', p.name, '===');
      console.log(JSON.stringify({status: res.status, data: res.data}, null, 2));
    } catch (err) {
      console.log('===', p.name, 'ERROR===');
      if (err.response) console.log(JSON.stringify({status: err.response.status, data: err.response.data}, null, 2));
      else console.log(err.message);
    }
  }
})();
