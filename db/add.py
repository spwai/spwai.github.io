#!/usr/bin/env python3

import json
import os
import re
import subprocess
from typing import List, Dict

def clean_username(username: str) -> str:
    cleaned = username.replace('_', ' ')
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', '', cleaned)
    cleaned = cleaned.strip()
    return cleaned

def insert_sorted(name_list: List[str], new_name: str) -> List[str]:
    for i, existing_name in enumerate(name_list):
        if new_name.lower() <= existing_name.lower():
            name_list.insert(i, new_name)
            return name_list
    name_list.append(new_name)
    return name_list

def load_igns() -> Dict[str, List[str]]:
    try:
        with open('igns.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"msr": [], "qt": []}
    except json.JSONDecodeError:
        return {"msr": [], "qt": []}

def save_igns(data: Dict[str, List[str]]) -> None:
    try:
        with open('igns.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving file: {e}")

def add_username(data: Dict[str, List[str]], category: str, username: str) -> bool:
    if category not in data:
        return False
    
    cleaned_username = clean_username(username)
    
    if not cleaned_username:
        return False
    
    if cleaned_username in data[category]:
        print(f"'{cleaned_username}' is already in the '{category}' list")
        return False
    
    other_category = "qt" if category == "msr" else "msr"
    if cleaned_username in data[other_category]:
        data[other_category].remove(cleaned_username)
        print(f"Moved '{cleaned_username}' from '{other_category}' to '{category}' list")
    else:
        print(f"Added '{cleaned_username}' to '{category}' list")
    
    data[category] = insert_sorted(data[category], cleaned_username)
    return True

def remove_username(data: Dict[str, List[str]], username: str) -> bool:
    cleaned_username = clean_username(username)
    
    if not cleaned_username:
        return False
    
    removed_from = []
    
    for category in ["msr", "qt"]:
        if cleaned_username in data[category]:
            data[category].remove(cleaned_username)
            removed_from.append(category)
    
    if removed_from:
        if len(removed_from) == 1:
            print(f"Removed '{cleaned_username}' from '{removed_from[0]}' list")
        else:
            print(f"Removed '{cleaned_username}' from both lists")
        return True
    else:
        print(f"'{cleaned_username}' not found in any list")
        return False

def get_latest_version():
    try:
        result = subprocess.run("git log --oneline -1", shell=True, capture_output=True, text=True, cwd=os.getcwd())
        if result.returncode == 0 and result.stdout.strip():
            commit_msg = result.stdout.strip()
            print(f"Debug: Latest commit: {commit_msg}")
            parts = commit_msg.split()
            if len(parts) >= 2 and parts[1].startswith("v"):
                version_part = parts[1][1:]
                if version_part.count('.') == 2:
                    return version_part
        return "0.0.0"
    except Exception as e:
        print(f"Debug: Error getting version: {e}")
        return "0.0.0"

def increment_version(version):
    parts = version.split('.')
    if len(parts) >= 3:
        major = int(parts[0])
        minor = int(parts[1])
        patch = int(parts[2])
        
        if patch == 9:
            if minor == 9:
                major += 1
                minor = 0
                patch = 0
            else:
                minor += 1
                patch = 0
        else:
            patch += 1
            
        return f"{major}.{minor}.{patch}"
    return "0.0.1"

def run_git_command(command):
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, cwd=os.getcwd())
        return result.returncode == 0, result.stdout.strip(), result.stderr.strip()
    except Exception as e:
        return False, "", str(e)

def push_version():
    current_version = get_latest_version()
    print(f"Debug: Current version detected: {current_version}")
    new_version = increment_version(current_version)
    print(f"Debug: New version calculated: {new_version}")
    
    print(f"v{current_version} -> v{new_version}")
    
    success, stdout, stderr = run_git_command("git add .")
    if not success:
        print(f"Error adding files: {stderr}")
        return
    
    success, stdout, stderr = run_git_command(f'git commit -m "v{new_version}"')
    if not success:
        print(f"Error committing: {stderr}")
        return
    
    success, stdout, stderr = run_git_command("git push")
    if not success:
        print(f"Error pushing: {stderr}")
        return
    
    print(f"Successfully pushed v{new_version} to GitHub")

def main():
    data = load_igns()
    
    while True:
        try:
            command = input("> ").strip()
            
            if not command:
                continue
            
            parts = command.split()
            cmd = parts[0].lower()
            
            if cmd in ['msr', 'qt']:
                if len(parts) < 2:
                    continue
                
                username = ' '.join(parts[1:])
                if add_username(data, cmd, username):
                    save_igns(data)
            elif cmd == 'remove':
                if len(parts) < 2:
                    print("Usage: remove <username>")
                    continue
                
                username = ' '.join(parts[1:])
                if remove_username(data, username):
                    save_igns(data)
            elif cmd == 'push':
                push_version()
                
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()