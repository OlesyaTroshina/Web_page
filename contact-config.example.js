/**
 * Настройка отправки формы «Написать мне».
 *
 * formsubmit — без хостинга, письма на formsubmitTo (при первой заявке — письмо-подтверждение).
 * api — Telegram через Vercel/Netlify (.env.example).
 * web3forms — ключ с https://web3forms.com
 */
window.SLADOST_CONTACT = {
  provider: 'formsubmit',
  formsubmitTo: '79189759453@ya.ru',

  endpoint: '/api/contact',
  web3formsAccessKey: '',
  web3formsTo: '79189759453@ya.ru',
  formspreeId: ''
};
