// ============================================
// AB DEV GAME DATA - All challenges and content
// ============================================

// Random Discovery Challenges - Massive expansion
export const randomChallenges = [
  // Level 1 - Basic logic / reaction / creativity
  { id: 1, type: 'logic', level: 1, title: 'Pattern Match', instruction: 'Find the next number: 2, 4, 8, 16, ?', options: ['24', '32', '30', '20'], correct: 1, time: 15 },
  { id: 2, type: 'reaction', level: 1, title: 'Quick Pick', instruction: 'Select the odd one out', options: ['🍎', '🍊', '🚗', '🍇'], correct: 2, time: 10 },
  { id: 3, type: 'logic', level: 1, title: 'Simple Math', instruction: 'What is 7 × 8?', options: ['54', '56', '64', '48'], correct: 1, time: 12 },
  { id: 4, type: 'reaction', level: 1, title: 'Color Match', instruction: 'Which color is NOT a primary color?', options: ['Red', 'Blue', 'Green', 'Yellow'], correct: 2, time: 10 },
  { id: 5, type: 'logic', level: 1, title: 'Word Logic', instruction: 'Which word is spelled correctly?', options: ['Recieve', 'Receive', 'Receve', 'Receeve'], correct: 1, time: 12 },
  { id: 6, type: 'reaction', level: 1, title: 'Quick Count', instruction: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], correct: 1, time: 8 },
  { id: 7, type: 'logic', level: 1, title: 'Sequence', instruction: 'What comes next: A, C, E, G, ?', options: ['H', 'I', 'J', 'K'], correct: 1, time: 12 },
  { id: 8, type: 'reaction', level: 1, title: 'Category Match', instruction: 'Which is a mammal?', options: ['Shark', 'Dolphin', 'Salmon', 'Eel'], correct: 1, time: 10 },
  { id: 9, type: 'logic', level: 1, title: 'Basic Pattern', instruction: '1, 3, 5, 7, ?', options: ['8', '9', '10', '11'], correct: 1, time: 10 },
  { id: 10, type: 'creativity', level: 1, title: 'Word Association', instruction: 'Sun is to Day as Moon is to?', options: ['Stars', 'Night', 'Dark', 'Sky'], correct: 1, time: 12 },

  // Level 2 - Timed decision-making
  { id: 11, type: 'memory', level: 2, title: 'Remember Sequence', instruction: 'Which color came first: Red, Blue, Green?', options: ['Red', 'Blue', 'Green', 'Yellow'], correct: 0, time: 8 },
  { id: 12, type: 'logic', level: 2, title: 'Logical Order', instruction: 'What comes next: Mon, Wed, Fri, ?', options: ['Sat', 'Sun', 'Thu', 'Tue'], correct: 1, time: 12 },
  { id: 13, type: 'decision', level: 2, title: 'Quick Decision', instruction: 'You smell gas. First action?', options: ['Call neighbor', 'Open windows', 'Light candle', 'Ignore it'], correct: 1, time: 10 },
  { id: 14, type: 'logic', level: 2, title: 'Number Pattern', instruction: '100, 95, 90, 85, ?', options: ['75', '80', '70', '82'], correct: 1, time: 12 },
  { id: 15, type: 'reaction', level: 2, title: 'Odd One Out', instruction: 'Find the odd one:', options: ['Square', 'Circle', 'Cube', 'Triangle'], correct: 2, time: 10 },
  { id: 16, type: 'decision', level: 2, title: 'Priority Check', instruction: 'Meeting in 5 mins, coffee spilled. Action?', options: ['Clean thoroughly', 'Quick wipe, go', 'Skip meeting', 'Change clothes'], correct: 1, time: 10 },
  { id: 17, type: 'logic', level: 2, title: 'Word Pattern', instruction: 'CAT : ACT :: DOG : ?', options: ['GOD', 'OGD', 'DGO', 'ODG'], correct: 0, time: 15 },
  { id: 18, type: 'memory', level: 2, title: 'Quick Recall', instruction: 'Sum of numbers: 3, 7, 2, 8?', options: ['18', '20', '22', '19'], correct: 1, time: 12 },
  { id: 19, type: 'decision', level: 2, title: 'Traffic Light', instruction: 'Light turns yellow. You are close. Action?', options: ['Speed up', 'Stop safely', 'Honk', 'Panic'], correct: 1, time: 8 },
  { id: 20, type: 'logic', level: 2, title: 'Analogy', instruction: 'Book : Read :: Music : ?', options: ['Write', 'Listen', 'Sing', 'Play'], correct: 1, time: 12 },

  // Level 3 - Multi-step challenge
  { id: 21, type: 'decision', level: 3, title: 'Priority Task', instruction: 'Under pressure, which task first?', options: ['Reply email', 'Fire alarm', 'Lunch break', 'Meeting prep'], correct: 1, time: 12 },
  { id: 22, type: 'pattern', level: 3, title: 'Hidden Rule', instruction: 'Find pattern: AB, BC, CD, ?', options: ['DE', 'EF', 'DD', 'CE'], correct: 0, time: 15 },
  { id: 23, type: 'logic', level: 3, title: 'Multi-Step Math', instruction: '(5 × 4) + (3 × 2) = ?', options: ['24', '26', '28', '22'], correct: 1, time: 15 },
  { id: 24, type: 'pattern', level: 3, title: 'Complex Pattern', instruction: '2, 6, 12, 20, 30, ?', options: ['40', '42', '44', '38'], correct: 1, time: 18 },
  { id: 25, type: 'decision', level: 3, title: 'Resource Management', instruction: 'Budget: $100. Need: $40 food, $30 transport, $50 utilities. What to cut?', options: ['Food', 'Transport', 'Utilities', 'Split all'], correct: 3, time: 15 },
  { id: 26, type: 'logic', level: 3, title: 'Sequence Logic', instruction: '1, 1, 2, 3, 5, 8, ?', options: ['11', '12', '13', '14'], correct: 2, time: 15 },
  { id: 27, type: 'pattern', level: 3, title: 'Letter Logic', instruction: 'AZ, BY, CX, ?', options: ['DW', 'DV', 'EW', 'CW'], correct: 0, time: 18 },
  { id: 28, type: 'decision', level: 3, title: 'Time Management', instruction: '3 tasks: 2hr, 1hr, 30min. Only 2 hours available. Which to skip?', options: ['2hr task', '1hr task', '30min task', 'Do partial of each'], correct: 0, time: 15 },
  { id: 29, type: 'logic', level: 3, title: 'Probability', instruction: 'Fair coin flipped 3 times. All heads probability?', options: ['1/2', '1/4', '1/8', '1/6'], correct: 2, time: 18 },
  { id: 30, type: 'pattern', level: 3, title: 'Visual Pattern', instruction: '○●○, ●○●, ○●○, ?', options: ['●●●', '○○○', '●○●', '○●●'], correct: 2, time: 15 },

  // Level 4 - Combined skills (logic + speed + memory)
  { id: 31, type: 'logic', level: 4, title: 'Multi-Step', instruction: 'If A=1, B=2, then CAB=?', options: ['312', '321', '123', '213'], correct: 0, time: 20 },
  { id: 32, type: 'combined', level: 4, title: 'Memory + Math', instruction: 'Remember: 7, 3, 9. Sum × smallest?', options: ['57', '54', '51', '48'], correct: 0, time: 18 },
  { id: 33, type: 'combined', level: 4, title: 'Speed Logic', instruction: 'Train A: 60km/h. Train B: 40km/h. Meet in 2hrs starting 200km apart?', options: ['Yes', 'No', 'After 2hrs', 'Before 2hrs'], correct: 0, time: 20 },
  { id: 34, type: 'combined', level: 4, title: 'Pattern + Memory', instruction: 'Complete: 3, 9, 27, 81, ?. Now recall first number.', options: ['243, then 3', '243, then 9', '162, then 3', '189, then 3'], correct: 0, time: 22 },
  { id: 35, type: 'logic', level: 4, title: 'Complex Analogy', instruction: 'Pen:Writer :: Scalpel:?', options: ['Doctor', 'Surgeon', 'Nurse', 'Patient'], correct: 1, time: 18 },
  { id: 36, type: 'combined', level: 4, title: 'Multi-Variable', instruction: 'X + Y = 10, X × Y = 21. X - Y = ?', options: ['2', '3', '4', '5'], correct: 2, time: 25 },
  { id: 37, type: 'decision', level: 4, title: 'Complex Priority', instruction: 'Deadline in 1hr, 3 tasks need 30min each. Critical, Important, Urgent. Order?', options: ['C-I-U', 'U-C-I', 'C-U-I', 'I-U-C'], correct: 1, time: 20 },
  { id: 38, type: 'logic', level: 4, title: 'Logical Deduction', instruction: 'All roses are flowers. Some flowers fade. Therefore:', options: ['All roses fade', 'Some roses may fade', 'No roses fade', 'Roses never fade'], correct: 1, time: 22 },
  { id: 39, type: 'combined', level: 4, title: 'Speed Calculation', instruction: 'Area of circle: radius 7, π ≈ 22/7', options: ['154', '148', '156', '144'], correct: 0, time: 25 },
  { id: 40, type: 'pattern', level: 4, title: 'Advanced Pattern', instruction: 'J, F, M, A, M, J, J, ?', options: ['A', 'S', 'O', 'N'], correct: 0, time: 18 },

  // Level 5 - Real-life inspired simulation
  { id: 41, type: 'simulation', level: 5, title: 'Route Decision', instruction: 'Fastest safe route during rush hour traffic?', options: ['Highway', 'Side streets', 'Wait 30min', 'Public transit'], correct: 3, time: 25 },
  { id: 42, type: 'simulation', level: 5, title: 'Emergency Response', instruction: 'Building fire, you\'re on 10th floor. Best action?', options: ['Use elevator', 'Jump out window', 'Use stairs calmly', 'Hide in bathroom'], correct: 2, time: 20 },
  { id: 43, type: 'simulation', level: 5, title: 'Budget Crisis', instruction: 'Income dropped 40%. Priority expense?', options: ['Entertainment', 'Rent/Mortgage', 'Dining out', 'Subscriptions'], correct: 1, time: 22 },
  { id: 44, type: 'simulation', level: 5, title: 'Medical Decision', instruction: 'Minor cut, bleeding continues. First action?', options: ['Call ambulance', 'Apply pressure', 'Pour alcohol', 'Ignore it'], correct: 1, time: 18 },
  { id: 45, type: 'simulation', level: 5, title: 'Career Choice', instruction: 'Two job offers: Higher pay vs Better growth. You\'re 25. Choose based on:', options: ['Money now', 'Growth potential', 'Flip coin', 'Reject both'], correct: 1, time: 25 },
  { id: 46, type: 'simulation', level: 5, title: 'Investment Decision', instruction: 'Market drops 30%. You have diversified portfolio. Action?', options: ['Sell everything', 'Buy more', 'Hold steady', 'Panic'], correct: 2, time: 22 },
  { id: 47, type: 'simulation', level: 5, title: 'Conflict Resolution', instruction: 'Two team members in heated argument. As manager:', options: ['Take sides', 'Ignore it', 'Private mediation', 'Public scolding'], correct: 2, time: 20 },
  { id: 48, type: 'simulation', level: 5, title: 'Time Crunch', instruction: 'Flight in 2hrs, 1hr to airport, not packed. Priority?', options: ['Pack carefully', 'Essentials only', 'Cancel flight', 'Book later flight'], correct: 1, time: 18 },
  { id: 49, type: 'simulation', level: 5, title: 'Negotiation', instruction: 'Buying car: Listed $20k, budget $17k. Opening offer?', options: ['$17k', '$15k', '$20k', '$18k'], correct: 1, time: 22 },
  { id: 50, type: 'simulation', level: 5, title: 'Crisis Leadership', instruction: 'Server down, clients calling, team panicking. First action?', options: ['Join panic', 'Assign roles calmly', 'Blame team', 'Go home'], correct: 1, time: 20 },

  // Additional challenges for variety
  { id: 51, type: 'logic', level: 2, title: 'Number Sequence', instruction: '10, 20, 40, 80, ?', options: ['100', '120', '160', '140'], correct: 2, time: 12 },
  { id: 52, type: 'pattern', level: 3, title: 'Mixed Pattern', instruction: 'A1, B2, C3, D4, ?', options: ['E5', 'F6', 'E4', 'D5'], correct: 0, time: 15 },
  { id: 53, type: 'logic', level: 4, title: 'Code Breaking', instruction: 'If APPLE = 50, BANANA = ?', options: ['42', '60', '48', '55'], correct: 1, time: 25 },
  { id: 54, type: 'reaction', level: 1, title: 'Speed Match', instruction: 'Which is largest?', options: ['1/2', '2/3', '3/4', '4/5'], correct: 3, time: 10 },
  { id: 55, type: 'decision', level: 3, title: 'Resource Allocation', instruction: '10 people, 7 chairs. Fair solution?', options: ['First come', 'Rotate every 10min', 'Stand all', 'Seniors first'], correct: 1, time: 15 },
  { id: 56, type: 'simulation', level: 5, title: 'Ethical Dilemma', instruction: 'Found $100 on street, no owner visible. Action?', options: ['Keep it', 'Report to police', 'Give to charity', 'Leave it'], correct: 1, time: 22 },
  { id: 57, type: 'combined', level: 4, title: 'Percentage', instruction: '25% of 80% of 500 = ?', options: ['100', '125', '80', '150'], correct: 0, time: 20 },
  { id: 58, type: 'logic', level: 2, title: 'Opposite', instruction: 'Antonym of EPHEMERAL:', options: ['Brief', 'Permanent', 'Fragile', 'Temporary'], correct: 1, time: 15 },
  { id: 59, type: 'pattern', level: 3, title: 'Number Triangle', instruction: '1, 3, 6, 10, 15, ?', options: ['20', '21', '22', '18'], correct: 1, time: 18 },
  { id: 60, type: 'simulation', level: 5, title: 'Tech Support', instruction: 'Computer won\'t start. First troubleshooting step?', options: ['Buy new one', 'Check power', 'Call IT', 'Restart repeatedly'], correct: 1, time: 18 },
];

// Voice Practice Content
export const voicePractices = [
  // Level 1 - Single words
  { id: 1, level: 1, text: 'Hello', mode: 'learning', environment: 'room' },
  { id: 2, level: 1, text: 'Welcome', mode: 'learning', environment: 'room' },
  { id: 3, level: 1, text: 'Thank you', mode: 'learning', environment: 'room' },
  { id: 4, level: 1, text: 'Goodbye', mode: 'learning', environment: 'room' },
  { id: 5, level: 1, text: 'Please', mode: 'learning', environment: 'room' },

  // Level 2 - Short sentences
  { id: 6, level: 2, text: 'Good morning, everyone.', mode: 'performance', environment: 'room' },
  { id: 7, level: 2, text: 'The quick brown fox jumps over the lazy dog.', mode: 'performance', environment: 'room' },
  { id: 8, level: 2, text: 'How may I help you today?', mode: 'mimic', environment: 'hall' },
  { id: 9, level: 2, text: 'Please hold the line, I will transfer you.', mode: 'performance', environment: 'room' },
  { id: 10, level: 2, text: 'Your order has been confirmed.', mode: 'learning', environment: 'room' },

  // Level 3 - Paragraph flow
  { id: 11, level: 3, text: 'Ladies and gentlemen, welcome aboard Flight 247. We will be departing shortly.', mode: 'announcement', environment: 'hall' },
  { id: 12, level: 3, text: 'In case of emergency, please proceed to the nearest exit calmly and quickly. Do not use elevators.', mode: 'emergency', environment: 'hall' },
  { id: 13, level: 3, text: 'Our next meeting will be held on Monday at 10 AM. Please confirm your attendance by Friday.', mode: 'performance', environment: 'room' },
  { id: 14, level: 3, text: 'The project deadline has been extended by one week. Please submit your work by the 15th.', mode: 'performance', environment: 'room' },
  { id: 15, level: 3, text: 'Thank you for calling customer support. Your satisfaction is our priority.', mode: 'mimic', environment: 'room' },

  // Level 4 - Emotion + speed control
  { id: 16, level: 4, text: 'I am thrilled to announce that we have exceeded our quarterly targets by twenty percent!', mode: 'emotion', environment: 'hall', emotion: 'excited' },
  { id: 17, level: 4, text: 'We regret to inform you that the event has been cancelled due to unforeseen circumstances.', mode: 'emotion', environment: 'room', emotion: 'somber' },
  { id: 18, level: 4, text: 'Congratulations! You have won the grand prize. Please come forward to receive your award.', mode: 'emotion', environment: 'hall', emotion: 'joyful' },
  { id: 19, level: 4, text: 'Please remain calm. The situation is under control. Follow the instructions of our staff.', mode: 'emotion', environment: 'hall', emotion: 'calm' },
  { id: 20, level: 4, text: 'This is your final warning. Repeated violations will result in termination.', mode: 'emotion', environment: 'room', emotion: 'firm' },

  // Level 5 - Real-world scenarios
  { id: 21, level: 5, text: 'Attention all passengers. Due to technical difficulties, Flight 247 has been delayed by approximately 45 minutes. We apologize for any inconvenience caused.', mode: 'announcement', environment: 'hall' },
  { id: 22, level: 5, text: 'Good afternoon, board members. Today I will be presenting our five-year growth strategy and the key initiatives that will drive our expansion into new markets.', mode: 'presentation', environment: 'hall' },
  { id: 23, level: 5, text: 'This is an emergency broadcast. Please evacuate the building immediately using the nearest stairwell. Do not attempt to collect personal belongings.', mode: 'emergency', environment: 'street' },
  { id: 24, level: 5, text: 'Hello, this is Dr. Smith from City Hospital. I am calling regarding your recent test results. Could you please call us back at your earliest convenience?', mode: 'call', environment: 'room' },
  { id: 25, level: 5, text: 'Breaking news: The mayor has announced a city-wide initiative to reduce carbon emissions by forty percent over the next decade.', mode: 'broadcast', environment: 'hall' },
];

// Imposter Game Sets
export const imposterSets = [
  // Level 1 - Simple category
  { id: 1, level: 1, items: ['Apple', 'Banana', 'Carrot', 'Orange'], imposter: 2, rule: 'Fruits vs Vegetable' },
  { id: 2, level: 1, items: ['Dog', 'Cat', 'Bird', 'Table'], imposter: 3, rule: 'Living vs Non-living' },
  { id: 3, level: 1, items: ['Red', 'Blue', 'Yellow', 'Circle'], imposter: 3, rule: 'Colors vs Shape' },
  { id: 4, level: 1, items: ['Car', 'Bus', 'Train', 'Tree'], imposter: 3, rule: 'Transport vs Plant' },
  { id: 5, level: 1, items: ['1', '2', '3', 'A'], imposter: 3, rule: 'Numbers vs Letter' },

  // Level 2 - Functional mismatch
  { id: 6, level: 2, items: ['Hammer', 'Screwdriver', 'Banana', 'Wrench'], imposter: 2, rule: 'Tools vs Food' },
  { id: 7, level: 2, items: ['Keyboard', 'Mouse', 'Monitor', 'Pillow'], imposter: 3, rule: 'Computer parts vs Bedding' },
  { id: 8, level: 2, items: ['Chef', 'Doctor', 'Engineer', 'Running'], imposter: 3, rule: 'Professions vs Activity' },
  { id: 9, level: 2, items: ['Swim', 'Run', 'Jump', 'Apple'], imposter: 3, rule: 'Actions vs Object' },
  { id: 10, level: 2, items: ['Shirt', 'Pants', 'Shoes', 'Ceiling'], imposter: 3, rule: 'Clothing vs Structure' },

  // Level 3 - Pattern-based logic
  { id: 11, level: 3, items: ['2', '4', '7', '8'], imposter: 2, rule: 'Even numbers only' },
  { id: 12, level: 3, items: ['AA', 'BB', 'CD', 'EE'], imposter: 2, rule: 'Repeating letters' },
  { id: 13, level: 3, items: ['Moon', 'Noon', 'Soon', 'Sun'], imposter: 3, rule: 'Words ending in "oon"' },
  { id: 14, level: 3, items: ['16', '25', '36', '48'], imposter: 3, rule: 'Perfect squares' },
  { id: 15, level: 3, items: ['ABC', 'DEF', 'GHI', 'JKM'], imposter: 3, rule: 'Consecutive letters' },

  // Level 4 - Hidden rule detection
  { id: 16, level: 4, items: ['Paris', 'London', 'Amazon', 'Tokyo'], imposter: 2, rule: 'Cities vs River' },
  { id: 17, level: 4, items: ['5', '10', '15', '22'], imposter: 3, rule: 'Multiples of 5' },
  { id: 18, level: 4, items: ['Eye', 'Ear', 'Elbow', 'Nose'], imposter: 2, rule: 'Starts with E, but Elbow has no sensory function' },
  { id: 19, level: 4, items: ['Mercury', 'Venus', 'Pluto', 'Mars'], imposter: 2, rule: 'Planets (Pluto is dwarf)' },
  { id: 20, level: 4, items: ['H2O', 'CO2', 'NaCl', 'ABC'], imposter: 3, rule: 'Chemical formulas' },

  // Level 5 - Real-life systems logic
  { id: 21, level: 5, items: ['Input', 'Process', 'Coffee', 'Output'], imposter: 2, rule: 'System flow step' },
  { id: 22, level: 5, items: ['Q1', 'Q2', 'Q3', 'Q5'], imposter: 3, rule: 'Financial quarters' },
  { id: 23, level: 5, items: ['CEO', 'CFO', 'CTO', 'ABC'], imposter: 3, rule: 'C-suite positions' },
  { id: 24, level: 5, items: ['TCP', 'HTTP', 'HTML', 'UDP'], imposter: 2, rule: 'Network protocols (HTML is markup)' },
  { id: 25, level: 5, items: ['Plan', 'Do', 'Eat', 'Check'], imposter: 2, rule: 'PDCA cycle steps' },
];

// Stress Relief Objects
export const stressObjects = [
  { id: 1, type: 'glass', emoji: '🍷', sound: 'glass', points: 10, name: 'Wine Glass' },
  { id: 2, type: 'plate', emoji: '🍽️', sound: 'ceramic', points: 15, name: 'Ceramic Plate' },
  { id: 3, type: 'box', emoji: '📦', sound: 'cardboard', points: 5, name: 'Cardboard Box' },
  { id: 4, type: 'bottle', emoji: '🍾', sound: 'glass', points: 20, name: 'Glass Bottle' },
  { id: 5, type: 'cup', emoji: '☕', sound: 'ceramic', points: 12, name: 'Coffee Cup' },
  { id: 6, type: 'vase', emoji: '🏺', sound: 'glass', points: 25, name: 'Decorative Vase' },
  { id: 7, type: 'mirror', emoji: '🪞', sound: 'glass', points: 30, name: 'Mirror' },
  { id: 8, type: 'jar', emoji: '🫙', sound: 'glass', points: 18, name: 'Glass Jar' },
  { id: 9, type: 'pot', emoji: '🪴', sound: 'ceramic', points: 22, name: 'Flower Pot' },
  { id: 10, type: 'bowl', emoji: '🥣', sound: 'ceramic', points: 14, name: 'Ceramic Bowl' },
  { id: 11, type: 'can', emoji: '🥫', sound: 'metal', points: 8, name: 'Metal Can' },
  { id: 12, type: 'crate', emoji: '🪵', sound: 'wood', points: 16, name: 'Wooden Crate' },
];

// Draw Challenges
export const drawChallenges = [
  // Level 1 - Copy visible object
  { id: 1, level: 1, type: 'copy', instruction: 'Draw a circle', time: 30, tools: 4, undos: 5 },
  { id: 2, level: 1, type: 'copy', instruction: 'Draw a square', time: 30, tools: 4, undos: 5 },
  { id: 3, level: 1, type: 'copy', instruction: 'Draw a triangle', time: 30, tools: 4, undos: 5 },
  { id: 4, level: 1, type: 'copy', instruction: 'Draw a star', time: 40, tools: 4, undos: 5 },
  { id: 5, level: 1, type: 'copy', instruction: 'Draw a heart', time: 35, tools: 4, undos: 5 },

  // Level 2 - Draw with limited tools
  { id: 6, level: 2, type: 'constraint', instruction: 'Draw a house using only triangles', time: 45, tools: 2, undos: 3 },
  { id: 7, level: 2, type: 'constraint', instruction: 'Draw a tree using only circles', time: 45, tools: 2, undos: 3 },
  { id: 8, level: 2, type: 'constraint', instruction: 'Draw a face using only lines', time: 50, tools: 2, undos: 3 },
  { id: 9, level: 2, type: 'constraint', instruction: 'Draw a car using only rectangles', time: 50, tools: 2, undos: 3 },
  { id: 10, level: 2, type: 'constraint', instruction: 'Draw a flower using only dots', time: 45, tools: 2, undos: 3 },

  // Level 3 - Draw from memory
  { id: 11, level: 3, type: 'memory', instruction: 'Draw the shape you saw earlier', time: 30, tools: 3, undos: 2, preview: '○△□' },
  { id: 12, level: 3, type: 'memory', instruction: 'Recreate the pattern shown', time: 35, tools: 3, undos: 2, preview: '◇◆◇' },
  { id: 13, level: 3, type: 'memory', instruction: 'Draw the symbol in correct orientation', time: 30, tools: 3, undos: 2, preview: '↑→↓' },
  { id: 14, level: 3, type: 'memory', instruction: 'Replicate the logo you just saw', time: 40, tools: 3, undos: 2, preview: '★' },
  { id: 15, level: 3, type: 'memory', instruction: 'Draw the geometric sequence', time: 35, tools: 3, undos: 2, preview: '□○△' },

  // Level 4 - Abstract visualization
  { id: 16, level: 4, type: 'abstract', instruction: 'Represent "happiness" visually', time: 60, tools: 2, colors: 2, undos: 2 },
  { id: 17, level: 4, type: 'abstract', instruction: 'Visualize "confusion"', time: 60, tools: 2, colors: 2, undos: 2 },
  { id: 18, level: 4, type: 'abstract', instruction: 'Draw "speed" as a concept', time: 55, tools: 2, colors: 2, undos: 2 },
  { id: 19, level: 4, type: 'abstract', instruction: 'Represent "balance" visually', time: 55, tools: 2, colors: 2, undos: 2 },
  { id: 20, level: 4, type: 'abstract', instruction: 'Visualize "growth"', time: 60, tools: 2, colors: 2, undos: 2 },

  // Level 5 - Complex challenges
  { id: 21, level: 5, type: 'complex', instruction: 'Design a logo for an eco-friendly brand', time: 90, tools: 3, colors: 3, undos: 1 },
  { id: 22, level: 5, type: 'complex', instruction: 'Create an icon for a music app', time: 90, tools: 3, colors: 3, undos: 1 },
  { id: 23, level: 5, type: 'complex', instruction: 'Design a warning sign for high voltage', time: 80, tools: 3, colors: 2, undos: 1 },
  { id: 24, level: 5, type: 'complex', instruction: 'Create a symbol for international peace', time: 90, tools: 3, colors: 3, undos: 1 },
  { id: 25, level: 5, type: 'complex', instruction: 'Design a minimalist clock face', time: 85, tools: 3, colors: 2, undos: 1 },
];

// Role-Based Scenarios
export const roleScenarios = [
  // Level 1 - Single decision
  { id: 1, level: 1, role: 'Leader', situation: 'Your team member is late for an important presentation.', options: ['Wait and start late', 'Start without them', 'Call to check', 'Reschedule meeting'], consequences: ['Client frustrated', 'Team member embarrassed', 'Shows care, slight delay', 'Unprofessional'], best: 2 },
  { id: 2, level: 1, role: 'Employee', situation: 'You notice a colleague making a small mistake.', options: ['Ignore it', 'Correct publicly', 'Mention privately', 'Report to manager'], consequences: ['Error persists', 'Embarrassment', 'Helpful approach', 'May seem petty'], best: 2 },
  { id: 3, level: 1, role: 'Customer', situation: 'You received wrong item in your order.', options: ['Keep it silently', 'Demand refund angrily', 'Contact support politely', 'Leave bad review'], consequences: ['Accept loss', 'Conflict', 'Problem solved', 'Damages reputation'], best: 2 },

  // Level 2 - Branching outcomes
  { id: 4, level: 2, role: 'Responder', situation: 'Fire alarm goes off during a customer call.', options: ['Ignore and continue', 'End call immediately', 'Politely pause call', 'Transfer to colleague'], consequences: ['Safety risk', 'Rude behavior', 'Professional handling', 'Delays but safe'], best: 2 },
  { id: 5, level: 2, role: 'Team Lead', situation: 'Two team members have different approaches to a problem.', options: ['Pick favorite', 'Combine both', 'Let them compete', 'Test both approaches'], consequences: ['Bias shown', 'May work', 'Creates tension', 'Data-driven decision'], best: 3 },
  { id: 6, level: 2, role: 'Neighbor', situation: 'Loud music from next door at 11 PM.', options: ['Call police immediately', 'Bang on wall', 'Knock and ask politely', 'Put on headphones'], consequences: ['Escalates conflict', 'Passive aggressive', 'Direct communication', 'Avoids confrontation'], best: 2 },

  // Level 3 - Resource limitation
  { id: 7, level: 3, role: 'Planner', situation: 'Budget cut by 30%. Which project to cancel?', options: ['Marketing campaign', 'Staff training', 'Equipment upgrade', 'Safety measures'], consequences: ['Lower visibility', 'Skill gap', 'Efficiency drop', 'Risk increase'], best: 0 },
  { id: 8, level: 3, role: 'Manager', situation: 'Need to promote one person. Two equally qualified candidates.', options: ['Flip a coin', 'Promote senior one', 'Create shared role', 'Delay decision'], consequences: ['Unfair perception', 'May demotivate other', 'Creative solution', 'Loses momentum'], best: 2 },
  { id: 9, level: 3, role: 'Parent', situation: 'Child wants expensive toy, budget is tight.', options: ['Buy immediately', 'Explain finances', 'Promise for birthday', 'Find cheaper alternative'], consequences: ['Financial strain', 'Teaches value', 'Delayed gratification', 'Compromise solution'], best: 1 },

  // Level 4 - Moral vs logical conflict
  { id: 10, level: 4, role: 'Mediator', situation: 'Two team leads disagree on project direction.', options: ['Side with senior', 'Split the work', 'Facilitate discussion', 'Escalate to manager'], consequences: ['Bias perceived', 'Fragmented work', 'Collaborative solution', 'Shows weakness'], best: 2 },
  { id: 11, level: 4, role: 'Witness', situation: 'You saw your friend\'s spouse with someone else.', options: ['Tell friend immediately', 'Confront the spouse', 'Stay out of it', 'Gather more info first'], consequences: ['Messenger blamed', 'Direct confrontation', 'May regret silence', 'Informed decision'], best: 3 },
  { id: 12, level: 4, role: 'HR Manager', situation: 'Top performer accused of minor policy violation.', options: ['Ignore it', 'Full investigation', 'Quiet warning', 'Equal treatment'], consequences: ['Sets bad precedent', 'Fair but costly', 'Middle ground', 'Shows integrity'], best: 3 },

  // Level 5 - Multi-character dependency
  { id: 13, level: 5, role: 'Decision Maker', situation: 'Ethical dilemma: Profitable client uses unethical practices.', options: ['Continue business', 'End partnership', 'Negotiate changes', 'Report to authorities'], consequences: ['Complicit', 'Revenue loss', 'Potential change', 'Legal implications'], best: 2 },
  { id: 14, level: 5, role: 'CEO', situation: 'Layoffs needed. Choose: 10 new hires OR 2 senior employees.', options: ['10 new hires', '2 seniors', 'Salary cuts for all', 'Voluntary exits'], consequences: ['Lose fresh talent', 'Lose experience', 'Morale drop', 'Uncertainty'], best: 3 },
  { id: 15, level: 5, role: 'Doctor', situation: 'Two patients need organ, only one available. Young vs Elderly.', options: ['Young patient', 'Elderly patient', 'Medical criteria', 'Waiting list order'], consequences: ['Age discrimination?', 'Less life ahead', 'Objective decision', 'Fair system'], best: 2 },
];

// Daily Challenges
export const dailyChallengePool = [
  { id: 1, type: 'observation', task: 'Notice 3 new things in your daily route today', points: 50, difficulty: 'easy' },
  { id: 2, type: 'memory', task: 'Memorize 5 random phone numbers from your contacts', points: 60, difficulty: 'medium' },
  { id: 3, type: 'calm', task: 'Respond to every message with a 10-second pause first', points: 40, difficulty: 'easy' },
  { id: 4, type: 'logic', task: 'Solve 3 math problems without a calculator', points: 55, difficulty: 'medium' },
  { id: 5, type: 'creative', task: 'Write a 4-line poem about your morning', points: 45, difficulty: 'easy' },
  { id: 6, type: 'physical', task: 'Take 10 deep breaths before every decision today', points: 35, difficulty: 'easy' },
  { id: 7, type: 'social', task: 'Give a genuine compliment to someone you rarely talk to', points: 50, difficulty: 'medium' },
  { id: 8, type: 'observation', task: 'Count the number of red cars you see today', points: 40, difficulty: 'easy' },
  { id: 9, type: 'memory', task: 'Remember what you ate for each meal yesterday', points: 45, difficulty: 'easy' },
  { id: 10, type: 'calm', task: 'Practice 5 minutes of complete silence', points: 55, difficulty: 'medium' },
  { id: 11, type: 'logic', task: 'Plan tomorrow\'s schedule in detail before sleeping', points: 50, difficulty: 'medium' },
  { id: 12, type: 'creative', task: 'Describe your mood using only colors', points: 40, difficulty: 'easy' },
  { id: 13, type: 'physical', task: 'Walk 1000 extra steps today', points: 60, difficulty: 'medium' },
  { id: 14, type: 'social', task: 'Have a conversation without using the word "I"', points: 70, difficulty: 'hard' },
  { id: 15, type: 'observation', task: 'Notice and appreciate 5 small beautiful things', points: 45, difficulty: 'easy' },
  { id: 16, type: 'memory', task: 'Recall 10 capitals of countries', points: 55, difficulty: 'medium' },
  { id: 17, type: 'calm', task: 'Avoid checking your phone for 2 hours', points: 65, difficulty: 'hard' },
  { id: 18, type: 'logic', task: 'Identify 3 inefficiencies in your daily routine', points: 60, difficulty: 'medium' },
  { id: 19, type: 'creative', task: 'Create a new recipe with ingredients you have', points: 70, difficulty: 'hard' },
  { id: 20, type: 'physical', task: 'Stretch for 10 minutes', points: 50, difficulty: 'medium' },
  { id: 21, type: 'social', task: 'Write a thank-you note to someone', points: 55, difficulty: 'medium' },
];
