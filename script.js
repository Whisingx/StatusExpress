const BETTER_STACK_JSON_URL = 'https://whising.betteruptime.com/index.json';

function formatDowntimeText(seconds) {
  if (seconds === undefined || seconds === null || isNaN(seconds) || Number(seconds) <= 0) {
    return 'No Downtime';
  }

  const secNum = Number(seconds);
  const hrs = Math.floor(secNum / 3600);
  const mins = Math.floor((secNum % 3600) / 60);
  const secs = secNum % 60;
  
  let parts = [];
  if (hrs > 0) parts.push(`${hrs} ${hrs === 1 ? 'hour' : 'hours'}`);
  if (mins > 0) parts.push(`${mins} ${mins === 1 ? 'minute' : 'minutes'}`);
  if (secs > 0 && hrs === 0 && mins === 0) parts.push(`${secs} ${secs === 1 ? 'second' : 'seconds'}`);
  
  const formatted = parts.join(', ');
  return formatted ? `Down for ${formatted}` : 'No Downtime';
}

async function fetchBetterStackData() {
  const container = document.getElementById('endpoints-container');
  const statusText = document.getElementById('sys-status-text');
  const template = document.getElementById('service-card-template');

  if (!container || !template) return;

  statusText.innerText = "Status Express: Refreshing feed...";
  container.innerHTML = '<div style="padding: 12px; text-align: center;">Refreshing BetterStack Data, Please Wait.</div>';

  try {
    const response = await fetch(BETTER_STACK_JSON_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const json = await response.json();
    container.innerHTML = '';
    
    let rawItems = [];
    if (Array.isArray(json.data)) {
      rawItems = json.data;
    } else if (json.data && Array.isArray(json.data.resources)) {
      rawItems = json.data.resources;
    } else if (Array.isArray(json.included)) {
      rawItems = json.included;
    }

    const resources = rawItems.filter(item => {
      const type = item.type || '';
      const attr = item.attributes || item;
      if (type === 'status_page_section' || type === 'group' || attr.resource_type === 'Section') {
        return false;
      }
      return attr.public_name || attr.name;
    });

    if (resources.length === 0) {
      container.innerHTML = '<div style="padding: 10px; text-align: center;">No valid service endpoints found in JSON feed.</div>';
      statusText.innerText = "Status Express: Connected (No endpoints)";
      return;
    }

    let allOperational = true;

    resources.forEach(item => {
      const attr = item.attributes || item;
      const name = attr.public_name || attr.name || 'Service Endpoint';
      const explanation = attr.explanation || attr.description || 'No additional details provided for this service.';
      const status = attr.status || 'operational';
      const isUp = (status === 'operational');

      if (!isUp) allOperational = false;

      const badgeColor = isUp ? '#008000' : '#ff0000';
      const badgeText = isUp ? '[ ONLINE (200 OK) ]' : '[ DOWN ]';

      const cardClone = template.content.cloneNode(true);

      cardClone.querySelector('.service-name').textContent = name;
      
      const infoBtn = cardClone.querySelector('.info-btn');
      infoBtn.title = explanation;

      const badge = cardClone.querySelector('.status-badge');
      badge.style.color = badgeColor;
      badge.textContent = badgeText;

      const historyContainer = cardClone.querySelector('.history-container');
      const historyDays = attr.status_history || attr.days || [];

      if (historyDays.length === 0) {
        const span = document.createElement('span');
        span.style.cssText = "color:#000; font-size:9px;";
        span.textContent = "No history records available yet";
        historyContainer.appendChild(span);
      } else {
        historyDays.forEach(day => {
          const dayStatus = day.status || 'up';
          let fillColor = '#dfdfdf';
          if (dayStatus === 'up' || dayStatus === 'operational') {
            fillColor = '#008000';
          } else if (dayStatus === 'down' || dayStatus === 'downtime' || dayStatus === 'degraded') {
            fillColor = '#ff0000';
          }

          const dateLabel = day.day || day.date || 'Recent';
          
          const rawDuration = day.downtime_duration !== undefined ? day.downtime_duration : 
                             (day.down_duration !== undefined ? day.down_duration : day.downtime_seconds);
          
          const downtimeText = formatDowntimeText(rawDuration);
          const tooltipText = `${dateLabel} | Status: ${dayStatus.toUpperCase()} | ${downtimeText}`;
          
          const block = document.createElement('div');
          block.className = 'history-block';
          block.title = tooltipText;
          block.style.backgroundColor = fillColor;
          
          historyContainer.appendChild(block);
        });
      }

      container.appendChild(cardClone);
    });

    statusText.innerText = allOperational ? "Status Express: Connected, Fully Functional" : "Status Express: Connected, Outage Active";
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div style="color: red; padding: 10px;">Failed to fetch Better Stack JSON feed.</div>';
    statusText.innerText = "Status Express: Fetch Error";
  }
}

document.addEventListener('click', (e) => {
  const container = document.getElementById('viewMenuContainer');
  const dropdown = document.getElementById('viewDropdown');
  const viewBtn = document.getElementById('viewMenuBtn');

  if (viewBtn.contains(e.target)) {
    dropdown.classList.toggle('show');
    container.classList.toggle('active');
  } else {
    dropdown.classList.remove('show');
    container.classList.remove('active');
  }
});

fetchBetterStackData();