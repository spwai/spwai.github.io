import json
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
json_file_path = os.path.join(current_dir, 'igns.json')

with open(json_file_path, 'r', encoding='utf-8') as file:
    data = json.load(file)

def clean_and_sort(data_dict):
    cleaned_data = {}
    for key, names in data_dict.items():
        seen_lower = set()
        unique_names = []
        for name in names:
            name_lower = name.lower()
            if name_lower not in seen_lower:
                seen_lower.add(name_lower)
                unique_names.append(name)
        cleaned_data[key] = sorted(unique_names, key=lambda x: x.lower())
    return cleaned_data

sorted_data = clean_and_sort(data)

with open(json_file_path, 'w', encoding='utf-8') as file:
    json.dump(sorted_data, file, indent=4)

print(f"Duplicates removed and arrays sorted in {json_file_path}")