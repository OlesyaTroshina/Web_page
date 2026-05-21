window.SLADOST_CONTACT = {
  // Пока нет хостинга: письма на почту (один раз подтвердите ссылку из письма FormSubmit).
  // Когда будет Vercel/Netlify — смените на provider: 'api' и настройте Telegram в .env
  provider: 'formsubmit',
  formsubmitTo: '79189759453@ya.ru',

  endpoint: '/api/contact',
  web3formsAccessKey: '',
  web3formsTo: '79189759453@ya.ru',
  formspreeId: ''
};
