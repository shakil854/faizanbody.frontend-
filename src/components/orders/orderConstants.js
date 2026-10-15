/**
 * Work Order Definitions & Section Configs
 * Matches the physical Faizan Body workshop job card sheets.
 */

export const DEFAULT_ORDER_DATA = {
  order_no: '',
  order_date: new Date().toISOString().split('T')[0],
  condition_text: '',
  owner_name: '',
  mobile_number: '',
  entry_date: new Date().toISOString().split('T')[0],
  truck_chassis_no: '',
  shade_no: '',
  status: 'In Progress',
  cabin_work: {
    boxes: ['', '', ''],
    items: {
      moro: { value: '', done: false },
      peeth: { value: '', done: false },
      panal_chhapni: { value: '', done: false },
      paga_khidki: { value: '', done: false },
      dashboard_prakar: { value: '', done: false },
      anya_kaam: { value: '', done: false },
    },
  },
  inside_work: {
    boxes: ['', '', ''],
    items: {
      niyamit_furniture_four_t: { value: '', done: false },
      speaker_size: { value: '', done: false },
      sofa_seat: { value: '', done: false },
      carrier: { value: '', done: false },
      anya_kaam: { value: '', done: false },
    },
  },
  body_work: {
    boxes: ['', '', ''],
    items: {
      runner: { value: '', done: false },
      dhokha_lambai_matra: { value: '', done: false },
      side_oonchai: { value: '', done: false },
      side_prakar: { value: '', done: false },
      plate_motai_mm: { value: '', done: false },
      falka_prakar: { value: '', done: false },
      peeche_jaali_prakar: { value: '', done: false },
      peeche_vel: { value: '', done: false },
      side_khidki: { value: '', done: false },
      anya_kaam: { value: '', done: false },
    },
  },
  accessories: {
    boxes: ['', '', ''],
    items: {
      bari_prakar: { value: '', done: false },
      niyamit: { value: '', done: false },
      anya_kaam: { value: '', done: false },
    },
  },
  finishing_work: {
    color: { value: '', boxes: ['', '', ''], done: false },
    redium: { value: '', boxes: ['', '', ''], done: false },
    painting: { value: '', boxes: ['', '', ''], done: false },
    vayring: { value: '', boxes: ['', '', ''], done: false },
    glass: { value: '', boxes: ['', '', ''], done: false },
  },
  machro: {
    boxes: ['', '', ''],
    items: {
      plate_oonchai_thambhla: { value: '', done: false },
      side_pipe_matra_prakar: { value: '', done: false },
      bhaya_matra_prakar: { value: '', done: false },
      dhar: { value: '', done: false },
      top_pipe_angle_prakar: { value: '', done: false },
    },
  },
  md_signature: '',
  party_owner_signature: '',
  notes: '',
};

export const ORDER_SECTIONS = [
  {
    key: 'cabin_work',
    titleHindi: 'केबिन वर्क',
    titleEnglish: 'CABIN WORK',
    items: [
      {
        key: 'moro',
        label: 'मोरो',
        labelEnglish: 'Moro',
        options: [
          'BS4 Company Show (BS4 कंपनी शो)',
          'BS4 Anna Moro (BS4 अन्ना मोरो)',
          'BS6 Company Show (BS6 कंपनी शो)',
          'BS6 Anna Moro (BS6 अन्ना मोरो)',
        ],
      },
      {
        key: 'peeth',
        label: 'पीठ',
        labelEnglish: 'Peeth',
        options: [
          'Ply (प्लाई)',
          'Lakdu (लकड़ी)',
        ],
      },
      {
        key: 'panal_chhapni',
        label: 'पानल / दरवाज़ा की छापनी',
        labelEnglish: 'Panel / Door Design',
        options: [
          'Apple (एप्पल)',
          'Star (स्टार)',
          'Kalash (कलश / કળશ)',
        ],
      },
      {
        key: 'paga_khidki',
        label: 'पगा की खिड़की',
        labelEnglish: 'Foot Window',
        options: [
          'Bari (बारी)',
          'Apple (एप्पल)',
          'Star (स्टार)',
          'Kalash (कलश / કળશ)',
        ],
      },
      {
        key: 'dashboard_prakar',
        label: 'डैस्कबोर्ड प्रकार',
        labelEnglish: 'Dashboard Type',
        options: [
          'Regular (रेगुलर)',
          'Porbandar Type (पोरबंदर टाइप)',
        ],
      },
      {
        key: 'anya_kaam',
        label: 'अन्य काम',
        labelEnglish: 'Other Work',
        options: [],
      },
    ],
  },
  {
    key: 'inside_work',
    titleHindi: 'अंदर का काम',
    titleEnglish: 'INSIDE WORK',
    items: [
      {
        key: 'niyamit_furniture_four_t',
        label: 'नियमित / फर्नीचर / फोर टी',
        labelEnglish: 'Regular / Furniture / 4T',
        options: [
          'Sunmica (सनमाइका)',
          'SEP (एसईपी)',
          'Porbandar Type (पोरबंदर टाइप)',
        ],
      },
      {
        key: 'speaker_size',
        label: 'स्पीकर साइज',
        labelEnglish: 'Speaker Size',
        options: [
          '8/10',
          'Round (राउंड)',
          'Inda (इंडा)',
        ],
      },
      {
        key: 'sofa_seat',
        label: 'सोफा सीट',
        labelEnglish: 'Sofa Seat',
        options: [
          'Regular (रेगुलर)',
        ],
      },
      {
        key: 'carrier',
        label: 'कैरियल / कैरियर',
        labelEnglish: 'Carrier',
        options: [
          'Regular (रेगुलर)',
          'Porbandar Type (पोरबंदर टाइप)',
        ],
      },
      {
        key: 'anya_kaam',
        label: 'अन्य काम',
        labelEnglish: 'Other Work',
        options: [],
      },
    ],
  },
  {
    key: 'body_work',
    titleHindi: 'बॉडी वर्क',
    titleEnglish: 'BODY WORK',
    items: [
      {
        key: 'runner',
        label: 'रनर',
        labelEnglish: 'Runner',
        options: [
          '5 × 2.5',
          '6 × 3',
        ],
      },
      {
        key: 'dhokha_lambai_matra',
        label: 'धोखा: लम्बाई / मात्रा',
        labelEnglish: 'Dhokha: Length / Qty',
        options: [],
      },
      {
        key: 'side_oonchai',
        label: 'साइड ऊँचाई',
        labelEnglish: 'Side Height',
        options: [],
      },
      {
        key: 'side_prakar',
        label: 'साइड प्रकार: पतरा / प्लाई',
        labelEnglish: 'Side Type: Sheet / Ply',
        options: [
          'Patra (पतरा)',
          'Ply (प्लाई)',
        ],
      },
      {
        key: 'plate_motai_mm',
        label: 'प्लेट की मोटाई/mm',
        labelEnglish: 'Plate Thickness (mm)',
        options: [
          '4 mm',
          '5 mm',
        ],
      },
      {
        key: 'falka_prakar',
        label: 'फालका प्रकार: लोखंड / प्लाई / लकड़ी',
        labelEnglish: 'Falka: Iron / Ply / Wood',
        options: [
          'Lokhand (लोखंड)',
          'Ply (प्लाई)',
          'Lakdi (लकड़ी)',
        ],
      },
      {
        key: 'peeche_jaali_prakar',
        label: 'पीछे की जाली प्रकार',
        labelEnglish: 'Rear Mesh Type',
        options: [
          'Regular (रेगुलर)',
        ],
        extraKey: 'peeche_vel',
        extraLabel: 'वेल',
        extraLabelEnglish: 'Vel',
        extraOptions: [
          'Chotla Bel (चोटला बेल)',
          'Machhli (माछली)',
          'Porbandar Type (पोरबंदर टाइप)',
        ],
      },
      {
        key: 'side_khidki',
        label: 'साइड में खिड़की: ऊँचाई / लंबाई',
        labelEnglish: 'Side Window: H / L',
        options: [],
      },
      {
        key: 'anya_kaam',
        label: 'अन्य काम',
        labelEnglish: 'Other Work',
        options: [],
      },
    ],
  },
  {
    key: 'machro',
    titleHindi: 'माछरो',
    titleEnglish: 'MACHRO',
    items: [
      {
        key: 'plate_oonchai_thambhla',
        label: 'प्लेट से ऊँचाई / थांभला मात्रा',
        labelEnglish: 'Plate Height / Pillar Qty',
        options: [],
      },
      {
        key: 'side_pipe_matra_prakar',
        label: 'साइड में पाइप / मात्रा/प्रकार',
        labelEnglish: 'Side Pipe / Qty / Type',
        options: [],
      },
      {
        key: 'bhaya_matra_prakar',
        label: 'भया: मात्रा/ प्रकार',
        labelEnglish: 'Bhaya: Qty / Type',
        options: [],
      },
      {
        key: 'dhar',
        label: 'ढार',
        labelEnglish: 'Dhar',
        options: [],
      },
      {
        key: 'top_pipe_angle_prakar',
        label: 'टोप पर पाइप / एंगल/ प्रकार',
        labelEnglish: 'Top Pipe / Angle / Type',
        options: [
          'Pipe (पाइप)',
          'Angle (एंगल)',
        ],
      },
    ],
  },
  {
    key: 'accessories',
    titleHindi: 'ऐसेसरीज',
    titleEnglish: 'ACCESSORIES',
    items: [
      {
        key: 'bari_prakar',
        label: 'बारी प्रकार',
        labelEnglish: 'Window Type',
        options: [
          'Marwadi (मारवाड़ी)',
          'Rajkot Type (राजकोट टाइप)',
        ],
      },
      {
        key: 'niyamit',
        label: 'नियमित',
        labelEnglish: 'Regular Items',
        options: [],
      },
      {
        key: 'anya_kaam',
        label: 'अन्य काम',
        labelEnglish: 'Other Work',
        options: [],
      },
    ],
  },
  {
    key: 'finishing_work',
    titleHindi: 'फिनिशिंग वर्क',
    titleEnglish: 'FINISHING WORK',
    isFinishing: true,
    items: [
      {
        key: 'color',
        label: 'कलर',
        subLabel: 'COLOR',
        options: [
          'Cabin PU Body National (केबिन PU बॉडी नेशनल)',
          'Full PU (फुल PU)',
        ],
      },
      {
        key: 'redium',
        label: 'रेडियम',
        subLabel: 'REDIUM',
        options: [
          'Regular (रेगुलर)',
        ],
      },
      {
        key: 'painting',
        label: 'पेंटिंग',
        subLabel: 'PAINTING',
        options: [
          'Regular (रेगुलर)',
        ],
      },
      {
        key: 'vayring',
        label: 'वायरिंग',
        subLabel: 'VAYRING',
        options: [
          'Regular (रेगुलर)',
        ],
      },
      {
        key: 'glass',
        label: 'ग्लास',
        subLabel: 'GLASS',
        options: [],
      },
    ],
  },
];

/**
 * Calculate completion percentage and completed tasks count
 */
export function calculateOrderProgress(order) {
  if (!order) return { total: 0, done: 0, percentage: 0 };

  let total = 0;
  let done = 0;

  // Regular sections
  ['cabin_work', 'inside_work', 'body_work', 'accessories', 'machro'].forEach((secKey) => {
    const sec = order[secKey];
    if (sec && sec.items) {
      Object.values(sec.items).forEach((item) => {
        total++;
        if (item && item.done) done++;
      });
    }
  });

  // Finishing section
  if (order.finishing_work) {
    ['color', 'redium', 'painting', 'vayring', 'glass'].forEach((fKey) => {
      const fItem = order.finishing_work[fKey];
      total++;
      if (fItem && fItem.done) done++;
    });
  }

  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, percentage };
}
