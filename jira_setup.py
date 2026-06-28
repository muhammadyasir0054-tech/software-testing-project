import os
import json
import base64
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

# Default mock stories and test cases if no real Jira config is active
STORIES_DATA = [
    {
        "title": "EMS-1: User Authentication Login Gate",
        "description": "As an HR Administrator, I want to log into the Employee Management System, so that I can securely manage employee records.\n\nAcceptance Criteria:\n1. User must be redirected to login page when accessing secure routes.\n2. Login form must validate username and password syntax.\n3. Successful login redirects to Dashboard with active session.\n4. Invalid credentials must show clear red error alerts."
    },
    {
        "title": "EMS-2: Employee Directory Tabular View",
        "description": "As an HR Manager, I want to view a tabular list of all employees, so that I can see active staff details.\n\nAcceptance Criteria:\n1. Dashboard displays a responsive table listing Name, Email, Department, Salary, and Status.\n2. Search box filters list dynamically by Name or Email.\n3. Dropdown list filters employees by Department (e.g. Engineering, Sales, HR)."
    },
    {
        "title": "EMS-3: Add New Employee Records",
        "description": "As an Admin, I want to register a new employee, so that they are added to the corporate roster.\n\nAcceptance Criteria:\n1. clicking 'Add Employee' opens modal form.\n2. Validation: Email must be unique, salary must be a positive float.\n3. Upon successful creation, the new employee immediately appears in the directory table."
    },
    {
        "title": "EMS-4: Update Employee Roster Records",
        "description": "As an Admin, I want to edit an employee's profile, so that their job details remain current.\n\nAcceptance Criteria:\n1. clicking Edit opens the employee form loaded with current details.\n2. Submitting changes immediately updates database records and dashboard listings."
    },
    {
        "title": "EMS-5: Delete Employee Records",
        "description": "As an Admin, I want to remove employee records, so that offboarded staff are deleted from the system.\n\nAcceptance Criteria:\n1. clicking Delete button displays a confirmation window.\n2. Confirming deletion removes database record and updates active count stats."
    }
]

TEST_CASES_DATA = [
    {
        "title": "TC-1: Successful Login with Valid Credentials",
        "steps": "1. Navigate to login page\n2. Enter admin@ems.com and admin123\n3. Click Login\n4. Verify redirect to Dashboard & status count active."
    },
    {
        "title": "TC-2: Rejected Login with Invalid Username",
        "steps": "1. Navigate to login page\n2. Enter wrong@ems.com and admin123\n3. Click Login\n4. Verify error message 'User not found' is visible."
    },
    {
        "title": "TC-3: Create Employee - Successful Save",
        "steps": "1. Login to system\n2. Click 'Add Employee' button\n3. Enter valid Name, Email, select Engineering, enter positive Salary\n4. Submit form\n5. Verify employee appears in the directory table."
    },
    {
        "title": "TC-4: Create Employee - Reject Duplicate Email",
        "steps": "1. Login to system\n2. Click 'Add Employee'\n3. Enter details using an email that already exists\n4. Submit form\n5. Verify error notification 'Email already exists' is displayed."
    },
    {
        "title": "TC-5: Search and Filter Employees by Department",
        "steps": "1. Login to system\n2. Select 'Engineering' from department filter dropdown\n3. Verify table matches department records\n4. Type name in search box\n5. Verify row lists are filtered dynamically."
    },
    {
        "title": "TC-6: Update Salary and Verify Modifications",
        "steps": "1. Login to system\n2. Click Edit on an existing row\n3. Update salary value\n4. Save form\n5. Verify modified salary is displayed."
    },
    {
        "title": "TC-7: Delete Employee - Verify Confirmation",
        "steps": "1. Login to system\n2. Click Delete on employee row\n3. Verify modal overlay is displayed\n4. Click Confirm\n5. Verify row is deleted and count decremented."
    }
]

def load_env():
    env = {}
    if os.path.exists('.env'):
        with open('.env', 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, val = line.strip().split('=', 1)
                    env[key.strip()] = val.strip()
    return env

def connect_jira(env):
    site_url = env.get("JIRA_SITE_URL")
    email = env.get("JIRA_EMAIL")
    token = env.get("JIRA_API_TOKEN")
    project_key = env.get("JIRA_PROJECT_KEY", "EMS")

    if not all([site_url, email, token]) or "your-domain" in site_url or "your-email" in email or "your-jira-api-token" in token:
        print("[!] Missing or default Jira configurations in .env file. Running script in Mock/Documentation simulation mode.")
        print("-" * 80)
        return False

    print(f"[*] Attempting connection to Jira site: {site_url}...")
    auth_str = f"{email}:{token}"
    b64_auth = base64.b64encode(auth_str.encode()).decode()

    # Verify connection by calling Jira API endpoint (GET projects)
    url = f"{site_url.rstrip('/')}/rest/api/3/project"
    req = Request(url)
    req.add_header("Authorization", f"Basic {b64_auth}")
    req.add_header("Accept", "application/json")

    try:
        with urlopen(req) as response:
            projects = json.loads(response.read().decode())
            print("[+] Successfully connected to Jira! Found projects: " + ", ".join([p['key'] for p in projects]))
            return b64_auth
    except HTTPError as e:
        print(f"[-] Jira API connection failed (HTTP {e.code}): {e.reason}")
        return False
    except URLError as e:
        print(f"[-] Connection Error: {e.reason}")
        return False

def create_issue(b64_auth, site_url, project_key, summary, description, issue_type="Story"):
    url = f"{site_url.rstrip('/')}/rest/api/3/issue"
    payload = {
        "fields": {
            "project": {
                "key": project_key
            },
            "summary": summary,
            "description": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": description
                            }
                        ]
                    }
                ]
            },
            "issuetype": {
                "name": issue_type
            }
        }
    }
    
    req = Request(url, data=json.dumps(payload).encode(), method='POST')
    req.add_header("Authorization", f"Basic {b64_auth}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")

    try:
        with urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            print(f"[✓] Created Jira {issue_type}: {res_data.get('key')} - {summary}")
            return res_data.get('key')
    except HTTPError as e:
        print(f"[!] Failed to create Jira {issue_type}: HTTP {e.code} - {e.reason}")
        return None
    except Exception as e:
        print(f"[!] Failed to create Jira {issue_type}: {str(e)}")
        return None

def main():
    env = load_env()
    b64_auth = connect_jira(env)
    
    if b64_auth:
        site_url = env.get("JIRA_SITE_URL")
        project_key = env.get("JIRA_PROJECT_KEY", "EMS")
        
        print(f"\n[*] Creating {len(STORIES_DATA)} User Stories in project {project_key}...")
        for story in STORIES_DATA:
            create_issue(b64_auth, site_url, project_key, story['title'], story['description'], "Story")
            
        print(f"\n[*] Creating {len(TEST_CASES_DATA)} Test Cases / Tasks in project {project_key}...")
        for tc in TEST_CASES_DATA:
            # We map test cases as subtasks or tasks in standard Jira projects
            create_issue(b64_auth, site_url, project_key, tc['title'], tc['steps'], "Task")
            
        print("\n[+] Jira Project Setup Completed Successfully!")
    else:
        print("\n--- JIRA SIMULATION / DOCUMENTATION RUN ---")
        print("\n[User Stories with Acceptance Criteria]")
        for i, story in enumerate(STORIES_DATA, 1):
            print(f"\nUser Story {i}: {story['title']}")
            print("-" * len(story['title']))
            print(story['description'])
            
        print("\n" + "=" * 80)
        print("\n[Test Plan: Test Cases with Acceptance Steps]")
        for i, tc in enumerate(TEST_CASES_DATA, 1):
            print(f"\nTest Case {i}: {tc['title']}")
            print("-" * len(tc['title']))
            print(tc['steps'])
            
        print("\n" + "=" * 80)
        print("\n[INFO] Configure valid credentials in .env file to run this setup directly on Atlassian Jira.")

if __name__ == "__main__":
    main()
