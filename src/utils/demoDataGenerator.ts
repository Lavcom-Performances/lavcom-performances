/**
 * Generates realistic demo data for a laundromat
 * 6 months of operations (~3000 ops) with:
 * - Hourly patterns (peak hours: 9-12h, 17-20h)
 * - Weekly patterns (busier weekends)
 * - Seasonal variation (slower in summer)
 */

export interface DemoOperation {
  operation_date: string;
  operation_time: string;
  amount: number;
  machine: string;
  program: string;
  payment_mode: string;
}

const MACHINES = [
  "LL-01", "LL-02", "LL-03", "LL-04", "LL-05", // 5 washers
  "SL-01", "SL-02", "SL-03" // 3 dryers
];

const PROGRAMS_WASHERS = [
  { name: "Lavage 30°", price: 4.50 },
  { name: "Lavage 40°", price: 5.00 },
  { name: "Lavage 60°", price: 6.00 },
  { name: "Lavage 90°", price: 7.00 },
  { name: "Express 20min", price: 3.50 },
];

const PROGRAMS_DRYERS = [
  { name: "Séchage 15min", price: 2.00 },
  { name: "Séchage 30min", price: 3.50 },
  { name: "Séchage 45min", price: 5.00 },
];

const PAYMENT_MODES = [
  { mode: "CB", weight: 45 },
  { mode: "Espèces", weight: 30 },
  { mode: "Carte Fidélité", weight: 15 },
  { mode: "Mobile", weight: 10 },
];

// Hourly distribution (0-23h) - peaks at 9-12 and 17-20
const HOURLY_WEIGHTS = [
  1, 1, 0, 0, 0, 1, 2, 4, 8, 12, 14, 12, // 0-11
  10, 8, 7, 6, 8, 12, 14, 12, 8, 5, 3, 2  // 12-23
];

// Day of week distribution (0=Sunday)
const DAY_WEIGHTS = [15, 10, 12, 12, 12, 14, 18]; // Sunday busiest, Monday slowest

// Monthly seasonal adjustment (0=Jan, 11=Dec)
const MONTH_WEIGHTS = [
  1.1, 1.0, 1.0, 0.95, 0.9, 0.75, // Jan-Jun (summer slower)
  0.7, 0.75, 0.95, 1.0, 1.1, 1.15  // Jul-Dec (winter busier)
];

function weightedRandom<T>(items: { weight: number; value: T }[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item.value;
  }
  
  return items[items.length - 1].value;
}

function getRandomPaymentMode(): string {
  return weightedRandom(
    PAYMENT_MODES.map(p => ({ weight: p.weight, value: p.mode }))
  );
}

function getRandomHour(): number {
  const totalWeight = HOURLY_WEIGHTS.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (let hour = 0; hour < 24; hour++) {
    random -= HOURLY_WEIGHTS[hour];
    if (random <= 0) return hour;
  }
  
  return 12;
}

function formatTime(hour: number): string {
  const minutes = Math.floor(Math.random() * 60);
  return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getOperationsForDay(date: Date): DemoOperation[] {
  const operations: DemoOperation[] = [];
  const dayOfWeek = date.getDay();
  const month = date.getMonth();
  
  // Base operations per day: 15-20
  const baseOps = 15 + Math.floor(Math.random() * 6);
  
  // Apply day and month weights
  const dayMultiplier = DAY_WEIGHTS[dayOfWeek] / 12;
  const monthMultiplier = MONTH_WEIGHTS[month];
  
  // Random daily variation (±20%)
  const dailyVariation = 0.8 + Math.random() * 0.4;
  
  const targetOps = Math.round(baseOps * dayMultiplier * monthMultiplier * dailyVariation);
  
  for (let i = 0; i < targetOps; i++) {
    const machine = MACHINES[Math.floor(Math.random() * MACHINES.length)];
    const isWasher = machine.startsWith("LL");
    
    const programs = isWasher ? PROGRAMS_WASHERS : PROGRAMS_DRYERS;
    const program = programs[Math.floor(Math.random() * programs.length)];
    
    // Add slight price variation (±10%)
    const priceVariation = 0.9 + Math.random() * 0.2;
    const amount = Math.round(program.price * priceVariation * 100) / 100;
    
    operations.push({
      operation_date: formatDate(date),
      operation_time: formatTime(getRandomHour()),
      amount,
      machine,
      program: program.name,
      payment_mode: getRandomPaymentMode(),
    });
  }
  
  // Sort by time
  operations.sort((a, b) => a.operation_time.localeCompare(b.operation_time));
  
  return operations;
}

export function generateDemoOperations(monthsBack: number = 6): DemoOperation[] {
  const operations: DemoOperation[] = [];
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);
  
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayOps = getOperationsForDay(currentDate);
    operations.push(...dayOps);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return operations;
}

export const DEMO_SITE_NAME = "Ma Laverie Démo";
export const DEMO_SITE_ADDRESS = "1 Place de l'Exemple";
export const DEMO_SITE_CITY = "Paris";
export const DEMO_SITE_POSTAL_CODE = "75001";
