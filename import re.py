import re

with open('app.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Cast getElementById when accessing .value
content = re.sub(
    r"document\.getElementById\('([^']+)'\)\.value", 
    r"(document.getElementById('\1') as HTMLInputElement).value", 
    content
)

# 2. Fix e.target.closest
content = re.sub(
    r"event\.target\.closest", 
    r"(event.target as HTMLElement).closest", 
    content
)
content = re.sub(
    r"e\.target\.closest", 
    r"(e.target as HTMLElement).closest", 
    content
)

# 3. Fix e.target in contains
content = re.sub(
    r"\.contains\(event\.target\)", 
    r".contains(event.target as Node)", 
    content
)

# 4. Fix e.target.value
content = re.sub(
    r"e\.target\.value", 
    r"(e.target as HTMLInputElement).value", 
    content
)

# 5. Fix this.value
content = re.sub(
    r"this\.value", 
    r"(this as HTMLInputElement).value", 
    content
)
content = re.sub(
    r"this\.type", 
    r"(this as HTMLInputElement).type", 
    content
)

# 6. Some remaining getElementById without .value but accessing other props
content = re.sub(
    r"document\.getElementById\('admin-month-input'\)\?\.showPicker\(\)", 
    r"(document.getElementById('admin-month-input') as HTMLInputElement)?.showPicker()", 
    content
)

with open('app.ts', 'w', encoding='utf-8') as f:
    f.write(content)
