const fs = require('fs');
const files = [
  'c:\\\\Users\\\\Arun kumar\\\\Desktop\\\\RapidMedico delivery\\\\src\\\\screens\\\\SignupScreen.tsx',
  'c:\\\\Users\\\\Arun kumar\\\\Desktop\\\\RapidMedico delivery\\\\src\\\\screens\\\\PharmacyPickupScreen.tsx',
  'c:\\\\Users\\\\Arun kumar\\\\Desktop\\\\RapidMedico delivery\\\\src\\\\screens\\\\KYCUploadScreen.tsx',
  'c:\\\\Users\\\\Arun kumar\\\\Desktop\\\\RapidMedico delivery\\\\src\\\\screens\\\\ActiveDeliveryScreen.tsx'
];

files.forEach(fp => {
  let c = fs.readFileSync(fp, 'utf8');
  c = c.replace(/'theme\.bg'/g, 'theme.bg');
  c = c.replace(/'theme\.cardBg'/g, 'theme.cardBg');
  c = c.replace(/"theme\.bg"/g, 'theme.bg');
  c = c.replace(/"theme\.cardBg"/g, 'theme.cardBg');
  fs.writeFileSync(fp, c, 'utf8');
});
console.log('Fixed quotes on theme values');
