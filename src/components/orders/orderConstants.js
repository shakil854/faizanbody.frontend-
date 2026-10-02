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
      { key: 'moro', label: 'मोरो' },
      { key: 'peeth', label: 'पीठ' },
      { key: 'panal_chhapni', label: 'पानल / दरवाज़ा की छापनी' },
      { key: 'paga_khidki', label: 'पगा की खिड़की' },
      { key: 'dashboard_prakar', label: 'डैस्कबोर्ड प्रकार' },
      { key: 'anya_kaam', label: 'अन्य काम' },
    ],
  },
  {
    key: 'inside_work',
    titleHindi: 'अंदर का काम',
    titleEnglish: 'INSIDE WORK',
    items: [
      { key: 'niyamit_furniture_four_t', label: 'नियमित / फर्नीचर / फोर टी' },
      { key: 'speaker_size', label: 'स्पीकर साइज' },
      { key: 'sofa_seat', label: 'सोफा सीट' },
      { key: 'carrier', label: 'कैरियर' },
      { key: 'anya_kaam', label: 'अन्य काम' },
    ],
  },
  {
    key: 'body_work',
    titleHindi: 'बॉडी वर्क',
    titleEnglish: 'BODY WORK',
    items: [
      { key: 'runner', label: 'रनर' },
      { key: 'dhokha_lambai_matra', label: 'धोखा: लम्बाई / मात्रा' },
      { key: 'side_oonchai', label: 'साइड ऊँचाई' },
      { key: 'side_prakar', label: 'साइड प्रकार: पतरा / प्लाई' },
      { key: 'plate_motai_mm', label: 'प्लेट की मोटाई/mm' },
      { key: 'falka_prakar', label: 'फालका प्रकार: लोखंड / प्लाई / लकड़ी' },
      { key: 'peeche_jaali_prakar', label: 'पीछे की जाली प्रकार', extraKey: 'peeche_vel', extraLabel: 'वेल' },
      { key: 'side_khidki', label: 'साइड में खिड़की: ऊँचाई / लंबाई' },
      { key: 'anya_kaam', label: 'अन्य काम' },
    ],
  },
  {
    key: 'machro',
    titleHindi: 'माछरो',
    titleEnglish: 'MACHRO',
    items: [
      { key: 'plate_oonchai_thambhla', label: 'प्लेट से ऊँचाई / थांभला मात्रा' },
      { key: 'side_pipe_matra_prakar', label: 'साइड में पाइप / मात्रा/प्रकार' },
      { key: 'bhaya_matra_prakar', label: 'भया: मात्रा/ प्रकार' },
      { key: 'dhar', label: 'ढार' },
      { key: 'top_pipe_angle_prakar', label: 'टोप पर पाइप / एंगल/ प्रकार' },
    ],
  },
  {
    key: 'accessories',
    titleHindi: 'ऐसेसरीज',
    titleEnglish: 'ACCESSORIES',
    items: [
      { key: 'bari_prakar', label: 'बारी प्रकार' },
      { key: 'niyamit', label: 'नियमित' },
      { key: 'anya_kaam', label: 'अन्य काम' },
    ],
  },
  {
    key: 'finishing_work',
    titleHindi: 'फिनिशिंग वर्क',
    titleEnglish: 'FINISHING WORK',
    isFinishing: true,
    items: [
      { key: 'color', label: 'कलर', subLabel: 'COLOR' },
      { key: 'redium', label: 'रेडियम', subLabel: 'REDIUM' },
      { key: 'painting', label: 'पेंटिंग', subLabel: 'PAINTING' },
      { key: 'vayring', label: 'वायरिंग', subLabel: 'VAYRING' },
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
    ['color', 'redium', 'painting', 'vayring'].forEach((fKey) => {
      const fItem = order.finishing_work[fKey];
      total++;
      if (fItem && fItem.done) done++;
    });
  }

  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, percentage };
}
