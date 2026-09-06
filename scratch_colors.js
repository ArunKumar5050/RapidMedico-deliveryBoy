const fs = require('fs');
const path = require('path');
const dir = 'c:\\Users\\Arun kumar\\Desktop\\RapidMedicoco delivery\\src\\screens';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const colorMap = {
  '#0a0f1c': 'theme.bg',
  '#0e1320': 'theme.bg',
  '#1a1f2d': 'theme.cardBg',
  '#303443': 'theme.cardBorder',
  '#161b29': 'theme.subtleBox',
  '#252a38': 'theme.containerHigh',
  '#dee2f5': 'theme.textPrimary',
  '#c2c6d6': 'theme.textSecondary',
  '#8c909f': 'theme.textMuted',
  '#adc6ff': 'theme.primary',
  '#4d8eff': 'theme.primaryGlow',
  '#4fdbc8': 'theme.secondaryAccent',
  '#4ae176': 'theme.success',
  '#6bff8f': 'theme.successGlow',
  '#f59e0b': 'theme.warning',
  '#fbbf24': 'theme.warningGlow',
  '#ffb4ab': 'theme.danger',
  '#ffdad6': 'theme.dangerGlow'
};

files.forEach(f => {
  const fp = path.join(dir, f);
  let c = fs.readFileSync(fp, 'utf8');
  let changed = false;
  
  for (const [hex, themeVar] of Object.entries(colorMap)) {
    const str1 = ": '" + hex + "'";
    const str2 = ': "' + hex + '"';
    
    while (c.includes(str1)) {
      c = c.replace(str1, ": " + themeVar);
      changed = true;
    }
    while (c.includes(str2)) {
      c = c.replace(str2, ": " + themeVar);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(fp, c, 'utf8');
    console.log('Updated ' + f);
  }
});
