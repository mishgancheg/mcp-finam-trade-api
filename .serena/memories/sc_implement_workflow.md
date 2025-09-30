# Workflow for the /sc:implement command

## Report saving rule

When the command `/sc:implement @prompts/prompt_*.md` is executed, at the end 
you must save a report about the work done to `doc/report_*.md`.

### File name template
- **Input file**: `prompts/prompt_*.md`
- **Output report**: `doc/report_*.md`

### Report structure
The report must include:
1. Execution date
2. Task description
3. List of completed tasks
4. Technical implementation details
5. Results
6. Usage instructions
7. List of created/modified files

This pattern applies to all `/sc:implement` commands with the `@prompts/prompt_*.md` parameter.
