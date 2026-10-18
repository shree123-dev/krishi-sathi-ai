/**
 * Krishi Sathi AI — Embedded Demo Location Directory
 * Provides instant, zero-latency prototype location data for State -> District -> Taluka -> Village.
 * Used for instant dropdown population and offline resilience.
 */

export const DEMO_LOCATION_DATABASE = {
  "Maharashtra": {
    "Wardha": {
      "Wardha": ["Sewagram", "Pipri", "Sawangi (Meghe)", "Nalwadi", "Sindi Meghe", "Borgaon", "Other / Enter manually"],
      "Deoli": ["Deoli", "Pulgaon", "Nachangaon", "Vijaygopal", "Gawha", "Other / Enter manually"],
      "Seloo": ["Seloo", "Ghorad", "Rehpode", "Sukli", "Zadshi", "Other / Enter manually"],
      "Arvi": ["Arvi", "Rohna", "Haranur", "Tewsa", "Virul", "Other / Enter manually"],
      "Ashti": ["Ashti", "Sahur", "Karanja (Ashti)", "Talonka", "Dhamangaon", "Other / Enter manually"],
      "Karanja": ["Karanja Lad", "Sarwadi", "Bangdapur", "Thanegaon", "Other / Enter manually"],
      "Hinganghat": ["Hinganghat", "Wadner", "Kandhli", "Pohna", "Alipur", "Other / Enter manually"],
      "Samudrapur": ["Samudrapur", "Girad", "Mandgaon", "Jam", "Other / Enter manually"]
    },
    "Nagpur": {
      "Nagpur Rural": ["Wadi", "Besa", "Beltarodi", "Bori", "Other / Enter manually"],
      "Kamptee": ["Kamptee", "Kanhan", "Tekadi", "Other / Enter manually"],
      "Hingna": ["Hingna", "Digdoh", "Nildoh", "Mohgaon", "Other / Enter manually"],
      "Katol": ["Katol", "Kondhali", "Yenwa", "Paradsinga", "Other / Enter manually"],
      "Narkhed": ["Narkhed", "Mowad", "Jalalkheda", "Other / Enter manually"],
      "Saoner": ["Saoner", "Khapa", "Kelod", "Badegaon", "Other / Enter manually"],
      "Umred": ["Umred", "Bhiwapur", "Sirsi", "Other / Enter manually"]
    },
    "Amravati": {
      "Amravati Rural": ["Badnera", "Walgaon", "Nandgaon Peth", "Other / Enter manually"],
      "Achalpur": ["Paratwada", "Pathrot", "Other / Enter manually"],
      "Chandur Railway": ["Chandur", "Dipore", "Kalamgaon", "Other / Enter manually"],
      "Morshi": ["Rithpur", "Dhamangaon", "Other / Enter manually"],
      "Warud": ["Shendurjana Ghat", "Benoda", "Other / Enter manually"]
    },
    "Yavatmal": {
      "Yavatmal Rural": ["Bhosa", "Loni", "Arni Naka", "Other / Enter manually"],
      "Pusad": ["Karanja", "Venkatraopet", "Other / Enter manually"],
      "Umarkhed": ["Dhanki", "Marlegaon", "Other / Enter manually"],
      "Wani": ["Kayar", "Maregaon", "Other / Enter manually"]
    },
    "Pune": {
      "Haveli": ["Khadakwasla", "Uruli Kanchan", "Wagholi", "Manjari", "Loni Kalbhor", "Other / Enter manually"],
      "Baramati": ["Malegaon Bk", "Katewadi", "Supa", "Kambleshwar", "Other / Enter manually"],
      "Shirur": ["Shikrapur", "Sanaswadi", "Pabal", "Other / Enter manually"],
      "Junnar": ["Otur", "Narayangaon", "Alephata", "Ozar", "Other / Enter manually"],
      "Daund": ["Patas", "Kedgaon", "Varvand", "Other / Enter manually"],
      "Khed": ["Chakan", "Rajgurunagar", "Alandi", "Shelgaon", "Other / Enter manually"]
    },
    "Nashik": {
      "Nashik": ["Deolali", "Bhagur", "Makhmalabad", "Other / Enter manually"],
      "Niphad": ["Pimpalgaon Baswant", "Lasalgaon", "Ozar", "Other / Enter manually"],
      "Dindori": ["Vani", "Nanashi", "Other / Enter manually"],
      "Malegaon": ["Malegaon Rural", "Camp", "Sayane", "Other / Enter manually"]
    },
    "Chhatrapati Sambhajinagar": {
      "Sambhajinagar": ["Waluj", "Harsul", "Chikalthana", "Other / Enter manually"],
      "Paithan": ["Bidkin", "Pachod", "Other / Enter manually"],
      "Gangapur": ["Lasur Station", "Waluj MIDC", "Other / Enter manually"]
    }
  },
  "Madhya Pradesh": {
    "Indore": {
      "Indore": ["Kanadia", "Hatod", "Rau", "Simrol", "Other / Enter manually"],
      "Sanwer": ["Manglia", "Chandrawatiganj", "Other / Enter manually"],
      "Depalpur": ["Betma", "Gautampura", "Other / Enter manually"]
    },
    "Bhopal": {
      "Huzur": ["Bairagarh", "Ratibad", "Misrod", "Other / Enter manually"],
      "Berasia": ["Narsingarh Road", "Damila", "Other / Enter manually"]
    },
    "Ujjain": {
      "Ujjain": ["Tajpur", "Panthpiplai", "Lekoda", "Other / Enter manually"],
      "Nagda": ["Nagda Rural", "Padlya", "Other / Enter manually"]
    }
  },
  "Gujarat": {
    "Rajkot": {
      "Rajkot": ["Kuvadva", "Bedipara", "Madhapar", "Other / Enter manually"],
      "Gondal": ["Kotda Sangani", "Bhojpara", "Other / Enter manually"]
    },
    "Surat": {
      "Chorasi": ["Dumas", "Hajira", "Sachin", "Other / Enter manually"],
      "Bardoli": ["Mahuva", "Madhi", "Other / Enter manually"]
    }
  },
  "Punjab": {
    "Ludhiana": {
      "Ludhiana West": ["Ayali Kalan", "Baddowal", "Mullanpur", "Other / Enter manually"],
      "Jagraon": ["Sidhwan Bet", "Swaddi Kalan", "Other / Enter manually"]
    },
    "Amritsar": {
      "Amritsar I": ["Attari", "Khasa", "Chogawan", "Other / Enter manually"]
    }
  },
  "Haryana": {
    "Karnal": {
      "Karnal": ["Kunjpura", "Gharaunda", "Taraori", "Other / Enter manually"]
    },
    "Hisar": {
      "Hisar": ["Barwala", "Hansi", "Narnaund", "Other / Enter manually"]
    }
  },
  "Uttar Pradesh": {
    "Varanasi": {
      "Sadar": ["Shivpur", "Rohania", "Ramnagar", "Other / Enter manually"],
      "Pindra": ["Phulpur", "Babatpur", "Other / Enter manually"]
    },
    "Lucknow": {
      "Bakshi Ka Talab": ["Itaunja", "Bhaisamau", "Other / Enter manually"],
      "Malihabad": ["Rahimabad", "Kakori", "Other / Enter manually"]
    }
  },
  "Karnataka": {
    "Dharwad": {
      "Dharwad": ["Alnavar", "Garag", "Hebballi", "Other / Enter manually"],
      "Hubballi": ["Chabbi", "Kundgol", "Other / Enter manually"]
    }
  },
  "Telangana": {
    "Warangal": {
      "Warangal": ["Geesugonda", "Inavolu", "Wardhannapet", "Other / Enter manually"]
    }
  },
  "Rajasthan": {
    "Kota": {
      "Ladpura": ["Mandana", "Kasba Kota", "Other / Enter manually"]
    }
  }
};

export function getDemoStates() {
  return Object.keys(DEMO_LOCATION_DATABASE).sort();
}

export function getDemoDistricts(state) {
  if (!state || !DEMO_LOCATION_DATABASE[state]) return [];
  return Object.keys(DEMO_LOCATION_DATABASE[state]).sort();
}

export function getDemoTalukas(state, district) {
  if (!state || !district || !DEMO_LOCATION_DATABASE[state] || !DEMO_LOCATION_DATABASE[state][district]) {
    return ["Other / Enter manually"];
  }
  const talukas = Object.keys(DEMO_LOCATION_DATABASE[state][district]).sort();
  if (!talukas.includes("Other / Enter manually")) {
    talukas.push("Other / Enter manually");
  }
  return talukas;
}

export function getDemoVillages(state, district, taluka) {
  if (
    !state || !district || !taluka ||
    !DEMO_LOCATION_DATABASE[state] ||
    !DEMO_LOCATION_DATABASE[state][district] ||
    !DEMO_LOCATION_DATABASE[state][district][taluka]
  ) {
    return ["Other / Enter manually"];
  }
  return DEMO_LOCATION_DATABASE[state][district][taluka];
}
