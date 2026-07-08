const { google } = require('googleapis');
const path = require('path');

// Charge les credentials du compte de service

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'joel.rothlisberger.2009@gmail.com';

// Durée par défaut d'un RDV en minutes
const RDV_DURATION = 60;

// Heures de travail (format 24h)
const WORK_START = 8;
const WORK_END = 18;

function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return auth;
}

// Récupère les créneaux occupés sur les 7 prochains jours
async function getBusySlots() {
  const auth = getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });

  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: now.toISOString(),
      timeMax: in7days.toISOString(),
      items: [{ id: CALENDAR_ID }],
    },
  });

  return response.data.calendars[CALENDAR_ID]?.busy || [];
}

// Génère les créneaux disponibles sur les 7 prochains jours
async function getAvailableSlots(count = 3) {
  const busySlots = await getBusySlots();
  const available = [];
  const now = new Date();

  for (let dayOffset = 0; dayOffset <= 7 && available.length < count; dayOffset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);

    // Skip dimanche (0)
    if (day.getDay() === 0) continue;

    for (let hour = WORK_START; hour < WORK_END && available.length < count; hour++) {
      const slotStart = new Date(day);
      slotStart.setHours(hour, 0, 0, 0);

      // Pas dans le passé
      if (slotStart <= now) continue;

      const slotEnd = new Date(slotStart.getTime() + RDV_DURATION * 60 * 1000);

      // Vérifie si le créneau est libre
      const isBusy = busySlots.some(busy => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return slotStart < busyEnd && slotEnd > busyStart;
      });

      if (!isBusy) {
        available.push({ start: slotStart, end: slotEnd });
      }
    }
  }

  return available;
}

// Formate un créneau en texte lisible en français
function formatSlot(slot, index) {
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

  const d = slot.start;
  const dayName = days[d.getDay()];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const hour = d.getHours().toString().padStart(2, '0');

  return `${index + 1}️⃣ ${dayName} ${day} ${month} à ${hour}h00`;
}

// Crée un RDV dans Google Calendar
async function createAppointment(slot, clientName, clientPhone, description) {
  const auth = getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });

  const event = {
    summary: `RDV ${clientName}`,
    description: `Client: ${clientName}\nTél: ${clientPhone}\nDemande: ${description}\n\nRDV pris via assistant WhatsApp`,
    start: {
      dateTime: slot.start.toISOString(),
      timeZone: 'Europe/Zurich',
    },
    end: {
      dateTime: slot.end.toISOString(),
      timeZone: 'Europe/Zurich',
    },
  };

  const response = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: event,
  });

  return response.data;
}

// Récupère un créneau par son numéro (1, 2 ou 3)
async function getSlotByNumber(number) {
  const slots = await getAvailableSlots(3);
  if (number < 1 || number > slots.length) return null;
  return slots[number - 1];
}

module.exports = {
  getAvailableSlots,
  formatSlot,
  createAppointment,
  getSlotByNumber,
};
