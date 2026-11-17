import { useUi } from '../store/uiStore';

// English / اردو. Add more lines here to translate more text.
const UR = {
  'Rooms and suites': 'کمرے اور سوئٹس', Dining: 'طعام', 'Spa and wellness': 'سپا اور صحت', Offers: 'آفرز', Gallery: 'گیلری', About: 'ہمارے بارے میں', Contact: 'رابطہ',
  'Sign in': 'لاگ اِن', 'Book now': 'ابھی بک کریں', 'My dashboard': 'میرا ڈیش بورڈ', Saved: 'محفوظ', Menu: 'مینو', Close: 'بند کریں',
  'Where every stay becomes a': 'جہاں ہر قیام بن جاتا ہے ایک', story: 'کہانی',
  'Quiet suites, attentive service and a city view from every window. Book direct for the best rate and Gold rewards.': 'پُرسکون سوئٹس، بہترین خدمت اور ہر کھڑکی سے شہر کا نظارہ۔ بہترین قیمت اور گولڈ ریوارڈز کے لیے براہِ راست بک کریں۔',
  'Explore rooms': 'کمرے دیکھیں', 'Join rewards': 'ریوارڈز میں شامل ہوں', 'Choose your space': 'اپنی جگہ منتخب کریں', 'See all rooms →': 'تمام کمرے ←',
  Hotel: 'ہوٹل', 'Check-in': 'چیک اِن', 'Check-out': 'چیک آؤٹ', Adults: 'افراد', 'Check availability': 'دستیابی دیکھیں',
  'Small details, done well': 'چھوٹی باتیں، بہترین انداز میں', 'What our guests say': 'ہمارے مہمانوں کی رائے',
  EXPLORE: 'دریافت', GUESTS: 'مہمان', RESERVATIONS: 'ریزرویشن', 'My stay': 'میرا قیام', FAQs: 'سوالات', 'Privacy and your data': 'پرائیویسی', 'Contact us': 'رابطہ کریں',
  'Hospitality, quietly perfected. Three hotels across Pakistan, one standard of care.': 'مہمان نوازی، خاموشی سے مکمل۔ پاکستان میں تین ہوٹل، ایک معیار۔',
  'Welcome back': 'خوش آمدید', 'Sign in to your LuxuryStay account': 'اپنے اکاؤنٹ میں لاگ اِن کریں', Email: 'ای میل', Password: 'پاس ورڈ', 'Create an account': 'نیا اکاؤنٹ بنائیں',
  Dashboard: 'ڈیش بورڈ', 'Front desk': 'فرنٹ ڈیسک', Reservations: 'ریزرویشنز', Calendar: 'کیلنڈر', Guests: 'مہمان', Housekeeping: 'صفائی', Maintenance: 'مرمت',
  'Service requests': 'سروس درخواستیں', 'Website messages': 'ویب سائٹ پیغامات', Invoices: 'انوائسز', 'Reports and pricing': 'رپورٹس اور قیمتیں', Feedback: 'آراء',
  'Rooms and 3D': 'کمرے اور 3D', 'Staff and roles': 'عملہ اور کردار', Settings: 'ترتیبات', 'Audit log': 'آڈٹ لاگ', 'My account': 'میرا اکاؤنٹ', 'My tasks': 'میرے کام',
  Bookings: 'بکنگز', 'Book a room': 'کمرہ بک کریں', 'Night audit': 'نائٹ آڈٹ', 'Promo codes': 'پرومو کوڈز', 'Log out': 'لاگ آؤٹ', Website: 'ویب سائٹ', Notifications: 'اطلاعات',
  'Search pages': 'صفحات تلاش کریں', MAIN: 'مرکزی', OPERATIONS: 'آپریشنز', FINANCE: 'مالیات', ADMIN: 'ایڈمن', ACCOUNT: 'اکاؤنٹ',
};

export function useT() {
  const lang = useUi((s) => s.lang);
  return (text) => (lang === 'ur' && UR[text]) || text;
}
