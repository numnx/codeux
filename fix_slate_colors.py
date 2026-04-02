import os
import re
import sys

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Step 1: text-slate-500 -> text-slate-600
    # Must not be preceded by dark:, hover:, group-hover:, placeholder:, disabled:, border-, ring-, etc.
    # We will use negative lookbehind for any word char or hyphen or colon.
    # Same for following.

    # We'll use a regex that matches "text-slate-500" only if it's not part of a larger class name like dark:text-slate-500
    # The regex: (?<![\w:-])text-slate-500(?![\w-])

    new_content = re.sub(r'(?<![\w:-])text-slate-500(?![\w-])', 'text-slate-600', content)

    # Step 2: text-slate-400 -> text-slate-500
    new_content = re.sub(r'(?<![\w:-])text-slate-400(?![\w-])', 'text-slate-500', new_content)

    # Step 3: dark:text-slate-500 -> dark:text-slate-400 (to maintain contrast on dark bg if we made something 500)
    # The requirement specifically mentions: "For dark mode, ensure the equivalent dark-mode text classes (dark:text-slate-400 or dark:text-slate-300) provide >=4.5:1 against the dark background."
    # Since text-slate-500 might have too low contrast on dark mode, we will make dark:text-slate-500 -> dark:text-slate-400
    # Let's replace dark:text-slate-500 with dark:text-slate-400.
    new_content = re.sub(r'(?<![\w:-])dark:text-slate-500(?![\w-])', 'dark:text-slate-400', new_content)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

def main():
    root_dir = 'dashboard/src/v2'
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith('.tsx') or filename.endswith('.ts'):
                process_file(os.path.join(dirpath, filename))

if __name__ == '__main__':
    main()
