const fs = require('fs');
const code = fs.readFileSync('App.jsx', 'utf8');

// find children of <div className="dashboard">
const dashboardStart = code.indexOf('<div className="dashboard">');
const dashboardStr = code.substring(dashboardStart, dashboardStart + 50000);

const lines = dashboardStr.split('\n');
lines.forEach(line => {
  const match = line.match(/^\s*<(header|section\s+className="[^"]+"|div\s+className="[^"]+")/);
  if (match) {
    console.log(match[0].trim());
  }
});
