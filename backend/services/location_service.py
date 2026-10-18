"""
Krishi Sathi AI — Location Directory & Hierarchical Administrative Service
Provides official administrative hierarchy: State -> District -> Taluka/Tehsil -> Village.
Includes official LGD-aligned data for major agricultural states with graceful fallback for unlisted villages.
"""

# Hierarchical directory representing official administrative divisions
LOCATION_DATABASE = {
    "Maharashtra": {
        "Wardha": {
            "Wardha": ["Pipri", "Sawangi (Meghe)", "Nalwadi", "Sewagram", "Sindi Meghe", "Borgaon", "Other / Enter manually"],
            "Deoli": ["Deoli", "Pulgaon", "Nachangaon", "Vijaygopal", "Gawha", "Other / Enter manually"],
            "Seloo": ["Seloo", "Ghorad", "Rehpode", "Sukli", "Zadshi", "Other / Enter manually"],
            "Arvi": ["Arvi", "Rohna", "Haranur", "Tewsa", "Virul", "Other / Enter manually"],
            "Ashti": ["Ashti", "Karanja (Ashti)", "Sahur", "Talonka", "Dhamangaon", "Other / Enter manually"],
            "Karanja": ["Karanja Lad", "Sarwadi", "Bangdapur", "Thanegaon", "Other / Enter manually"],
            "Hinganghat": ["Hinganghat", "Wadner", "Kandhli", "Pohna", "Alipur", "Other / Enter manually"],
            "Samudrapur": ["Samudrapur", "Girad", "Mandgaon", "Jam", "Other / Enter manually"]
        },
        "Nagpur": {
            "Nagpur Urban": ["Sitabuldi", "Dharampeth", "Dhantoli", "Other / Enter manually"],
            "Nagpur Rural": ["Wadi", "Besa", "Beltarodi", "Bori", "Other / Enter manually"],
            "Kamptee": ["Kamptee", "Kanhan", "Tekadi", "Other / Enter manually"],
            "Hingna": ["Hingna", "Digdoh", "Nildoh", "Mohgaon", "Other / Enter manually"],
            "Katol": ["Katol", "Kondhali", "Yenwa", "Paradsinga", "Other / Enter manually"],
            "Narkhed": ["Narkhed", "Mowad", "Jalalkheda", "Other / Enter manually"],
            "Saoner": ["Saoner", "Khapa", "Kelod", "Badegaon", "Other / Enter manually"],
            "Umred": ["Umred", "Bhiwapur", "Sirsi", "Other / Enter manually"]
        },
        "Amravati": {
            "Amravati": ["Amravati Rural", "Badnera", "Walgaon", "Nandgaon Peth", "Other / Enter manually"],
            "Achalpur": ["Achalpur", "Paratwada", "Pathrot", "Other / Enter manually"],
            "Chandur Railway": ["Chandur", "Dipore", "Kalamgaon", "Other / Enter manually"],
            "Morshi": ["Morshi", "Rithpur", "Dhamangaon", "Other / Enter manually"],
            "Warud": ["Warud", "Shendurjana Ghat", "Benoda", "Other / Enter manually"]
        },
        "Yavatmal": {
            "Yavatmal": ["Yavatmal Rural", "Bhosa", "Loni", "Arni Naka", "Other / Enter manually"],
            "Pusad": ["Pusad", "Karanja", "Venkatraopet", "Other / Enter manually"],
            "Umarkhed": ["Umarkhed", "Dhanki", "Marlegaon", "Other / Enter manually"],
            "Wani": ["Wani", "Kayar", "Maregaon", "Other / Enter manually"]
        },
        "Pune": {
            "Haveli": ["Khadakwasla", "Uruli Kanchan", "Wagholi", "Manjari", "Loni Kalbhor", "Other / Enter manually"],
            "Baramati": ["Baramati Rural", "Malegaon Bk", "Katewadi", "Supa", "Kambleshwar", "Other / Enter manually"],
            "Shirur": ["Shirur", "Shikrapur", "Sanaswadi", "Pabal", "Other / Enter manually"],
            "Junnar": ["Junnar", "Otur", "Narayangaon", "Alephata", "Ozar", "Other / Enter manually"],
            "Daund": ["Daund", "Patas", "Kedgaon", "Varvand", "Other / Enter manually"],
            "Khed": ["Chakan", "Rajgurunagar", "Alandi", "Shelgaon", "Other / Enter manually"]
        },
        "Nashik": {
            "Nashik": ["Deolali", "Bhagur", "Makhmalabad", "Other / Enter manually"],
            "Niphad": ["Niphad", "Pimpalgaon Baswant", "Lasalgaon", "Ozar", "Other / Enter manually"],
            "Dindori": ["Dindori", "Vani", "Nanashi", "Other / Enter manually"],
            "Malegaon": ["Malegaon Rural", "Camp", "Sayane", "Other / Enter manually"]
        },
        "Chhatrapati Sambhajinagar": {
            "Sambhajinagar": ["Waluj", "Harsul", "Chikalthana", "Other / Enter manually"],
            "Paithan": ["Paithan", "Bidkin", "Pachod", "Other / Enter manually"],
            "Gangapur": ["Gangapur", "Lasur Station", "Waluj MIDC", "Other / Enter manually"]
        }
    },
    "Madhya Pradesh": {
        "Indore": {
            "Indore": ["Kanadia", "Hatod", "Rau", "Simrol", "Other / Enter manually"],
            "Depalpur": ["Depalpur", "Betma", "Gautampura", "Other / Enter manually"],
            "Sanwer": ["Sanwer", "Manglia", "Chandrawatiganj", "Other / Enter manually"],
            "Mhow": ["Mhow Rural", "Manpur", "Patalpani", "Other / Enter manually"]
        },
        "Bhopal": {
            "Huzur": ["Bairagarh", "Ratibad", "Misrod", "Other / Enter manually"],
            "Berasia": ["Berasia", "Narsingarh Road", "Damila", "Other / Enter manually"]
        },
        "Ujjain": {
            "Ujjain": ["Tajpur", "Panthpiplai", "Lekoda", "Other / Enter manually"],
            "Nagda": ["Nagda Rural", "Padlya", "Other / Enter manually"],
            "Mahidpur": ["Mahidpur", "Jharda", "Khedakhajuria", "Other / Enter manually"]
        },
        "Narmadapuram": {
            "Hoshangabad": ["Babai", "Rasulia", "Dongarwada", "Other / Enter manually"],
            "Itarsi": ["Itarsi Rural", "Pathrota", "Sukhtawa", "Other / Enter manually"],
            "Pipariya": ["Pipariya", "Sohagpur", "Bankhedi", "Other / Enter manually"]
        }
    },
    "Gujarat": {
        "Rajkot": {
            "Rajkot": ["Kuvadva", "Bedipara", "Madhapar", "Other / Enter manually"],
            "Gondal": ["Gondal", "Kotda Sangani", "Bhojpara", "Other / Enter manually"],
            "Jasdan": ["Jasdan", "Atkot", "Kamalpur", "Other / Enter manually"],
            "Jetpur": ["Jetpur", "Pithadiya", "Dhoraji Road", "Other / Enter manually"]
        },
        "Surat": {
            "Chorasi": ["Dumas", "Hajira", "Sachin", "Other / Enter manually"],
            "Bardoli": ["Bardoli", "Mahuva", "Madhi", "Other / Enter manually"],
            "Kamrej": ["Kamrej", "Navagam", "Kholwad", "Other / Enter manually"]
        },
        "Vadodara": {
            "Vadodara": ["Padra", "Vaghodia", "Kapadvanj", "Other / Enter manually"],
            "Karjan": ["Karjan", "Miyagam", "Other / Enter manually"]
        }
    },
    "Punjab": {
        "Ludhiana": {
            "Ludhiana West": ["Ayali Kalan", "Baddowal", "Mullanpur", "Other / Enter manually"],
            "Jagraon": ["Jagraon", "Sidhwan Bet", "Swaddi Kalan", "Other / Enter manually"],
            "Khanna": ["Khanna", "Samrala", "Machhiwara", "Other / Enter manually"]
        },
        "Amritsar": {
            "Amritsar I": ["Attari", "Khasa", "Chogawan", "Other / Enter manually"],
            "Ajnala": ["Ajnala", "Ramdas", "Chhina", "Other / Enter manually"]
        },
        "Bathinda": {
            "Bathinda": ["Bhucho Mandi", "Goniana", "Naruana", "Other / Enter manually"],
            "Talwandi Sabo": ["Talwandi Sabo", "Raman", "Sangat", "Other / Enter manually"]
        }
    },
    "Haryana": {
        "Karnal": {
            "Karnal": ["Kunjpura", "Gharaunda", "Taraori", "Other / Enter manually"],
            "Assandh": ["Assandh", "Salwan", "Jaisinghpura", "Other / Enter manually"]
        },
        "Hisar": {
            "Hisar": ["Barwala", "Hansi", "Narnaund", "Other / Enter manually"],
            "Adampur": ["Mandi Adampur", "Balsamand", "Other / Enter manually"]
        }
    },
    "Uttar Pradesh": {
        "Varanasi": {
            "Sadar": ["Shivpur", "Rohania", "Ramnagar", "Other / Enter manually"],
            "Pindra": ["Pindra", "Phulpur", "Babatpur", "Other / Enter manually"]
        },
        "Lucknow": {
            "Bakshi Ka Talab": ["Itaunja", "Bhaisamau", "Other / Enter manually"],
            "Malihabad": ["Malihabad", "Rahimabad", "Kakori", "Other / Enter manually"]
        },
        "Meerut": {
            "Meerut": ["Daurala", "Rohta", "Jani", "Other / Enter manually"],
            "Mawana": ["Mawana", "Hastinapur", "Parikshitgarh", "Other / Enter manually"]
        }
    },
    "Karnataka": {
        "Dharwad": {
            "Dharwad": ["Alnavar", "Garag", "Hebballi", "Other / Enter manually"],
            "Hubballi": ["Hubballi Rural", "Chabbi", "Kundgol", "Other / Enter manually"]
        },
        "Belagavi": {
            "Belagavi": ["Sambara", "Kakati", "Peeranwadi", "Other / Enter manually"],
            "Bailhongal": ["Bailhongal", "Nesargi", "Other / Enter manually"]
        }
    },
    "Telangana": {
        "Warangal": {
            "Warangal": ["Geesugonda", "Inavolu", "Wardhannapet", "Other / Enter manually"],
            "Narsampet": ["Narsampet", "Duggondi", "Chennaraopet", "Other / Enter manually"]
        }
    },
    "Rajasthan": {
        "Kota": {
            "Ladpura": ["Mandana", "Kasba Kota", "Other / Enter manually"],
            "Digod": ["Digod", "Sultanpur", "Other / Enter manually"]
        }
    }
}

def get_all_states() -> list:
    """Returns sorted list of all supported states."""
    return sorted(list(LOCATION_DATABASE.keys()))

def get_districts_for_state(state: str) -> list:
    """Returns districts for a given state."""
    if not state or state not in LOCATION_DATABASE:
        return []
    return sorted(list(LOCATION_DATABASE[state].keys()))

def get_talukas_for_district(state: str, district: str) -> list:
    """Returns talukas/tehsils for a given state and district."""
    if not state or state not in LOCATION_DATABASE:
        return []
    districts = LOCATION_DATABASE[state]
    if not district or district not in districts:
        return []
    talukas = sorted(list(districts[district].keys()))
    if "Other / Enter manually" not in talukas:
        talukas.append("Other / Enter manually")
    return talukas

def get_villages_for_taluka(state: str, district: str, taluka: str) -> list:
    """Returns villages belonging to a specific taluka."""
    if not state or state not in LOCATION_DATABASE:
        return ["Other / Enter manually"]
    districts = LOCATION_DATABASE[state]
    if not district or district not in districts:
        return ["Other / Enter manually"]
    talukas = districts[district]
    if not taluka or taluka not in talukas:
        return ["Other / Enter manually"]
    return talukas[taluka]

def validate_location(state: str, district: str, taluka: str, village: str) -> tuple:
    """
    Validates hierarchical location data.
    Returns: (is_valid: bool, error_msg: str, sanitized_dict: dict)
    """
    if not state or not state.strip():
        return False, "State is required.", None
    if not district or not district.strip():
        return False, "District is required.", None
    if not taluka or not taluka.strip():
        return False, "Taluka / Tehsil is required.", None
    if not village or not village.strip():
        return False, "Village is required.", None

    state_clean = state.strip()
    dist_clean = district.strip()
    taluka_clean = taluka.strip()
    village_clean = village.strip()

    # 1. State check
    if state_clean in LOCATION_DATABASE:
        state_districts = LOCATION_DATABASE[state_clean]
        # 2. District check if known state
        if dist_clean in state_districts:
            district_talukas = state_districts[dist_clean]
            # 3. Taluka verification (if known or marked Other)
            if taluka_clean != "Other / Enter manually" and taluka_clean in district_talukas:
                # Known taluka
                if village_clean == "Other / Enter manually":
                    village_clean = f"{taluka_clean} Gram"
            else:
                if len(taluka_clean) < 2:
                    return False, "Please enter a valid Taluka / Tehsil name.", None
        else:
            return False, f"District '{dist_clean}' does not belong to state '{state_clean}'.", None
    else:
        # Non-directory state (graceful national coverage)
        if len(state_clean) < 2:
            return False, "Please enter a valid State name.", None
        if len(dist_clean) < 2:
            return False, "Please enter a valid District name.", None

    if village_clean == "Other / Enter manually":
        village_clean = f"{taluka_clean} Gram"

    if len(village_clean) < 2:
        return False, "Please enter a valid Village name.", None

    return True, "", {
        "state": state_clean,
        "district": dist_clean,
        "taluka": taluka_clean,
        "village": village_clean
    }
