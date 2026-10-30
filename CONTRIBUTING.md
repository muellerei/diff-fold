# Contributing to diff-fold

Hey, thanks for stopping by. diff-fold is a small helper for people who use Claude Code: it folds a finished edit's diff into one line per file. I keep it small on purpose, but that is a guide and not a rule: what makes it better is good ideas, and yours are welcome in any shape. An idea, a question, a bug report, a quick "works on my setup", a typo, a test on a terminal I don't have, some code. None of it has to be polished. Let's make it better together.

## Ways to help, no code needed

- **Tell me it works.** Even a short "works on my setup" helps. Main screen or fullscreen layout, your terminal, Bash diffs on or off: good or odd, I'd love to know.
- **Share an idea, even a half-baked one.** "It would be nice if…" is a perfectly good start. Tell me what you wanted to see and what got in the way, and we figure out the rest together.
- **Ask a question.** If the README confused you, that is useful to know: it means the README needs a better sentence.
- **Report a bug.** Say what you can: your Claude Code version, which tool made the change, what the line showed and what you expected. A half-filled report is welcome too. Please use made-up names in examples and leave real project or file names out.
- **Fix a typo or a clumsy sentence.**

Open an [issue](https://github.com/muellerei/diff-fold/issues) or start a [discussion](https://github.com/muellerei/diff-fold/discussions), whichever feels natural. No need to pick the right place, I'll move it if it fits better elsewhere, and no need to ask first. Write in whatever language suits you. The repository is in English, so English is a plus where you can.

## A file that should stay in full

Some files are never folded because a summary line would hide what a change to them does: secrets, what runs on its own such as CI workflows and git hooks, and what steers Claude (the list is under What it folds in the README). If you work with a file that belongs on that list, tell me which one and why, or add it yourself if you feel like it, and I'll show you where.

## Build and check

You need Claude Code (the version is under Install in the README), Node and Python 3. From a clone:

```bash
claude plugin validate .
claude plugin test .
claude --plugin-dir . -p "reply with the word ok"   # lays down the types tsc needs, once
npx -p typescript@5 tsc -p .
npx prettier@3 --check hooks types docs
python3 docs/src/check.py
```

The third line is a short call to the model, so you need to be signed in. [docs/development.md](docs/development.md) has the rest, and how to see why a diff was or wasn't folded. Stuck on a step? Tell me. I'd rather fix this page than have you struggle.

## What makes a change easy to merge

A few things help a pull request go in smoothly. None of them is a hurdle, and none stands in the way of an idea:

- A test that fails without your change, so we both see it works.
- A line under `[Unreleased]` in `CHANGELOG.md` when behaviour changes.
- One thought per pull request, with a short subject line in English ("Keep changes to .npmrc in full").

Not sure about any of it? Open the pull request anyway and we'll sort it out together. It doesn't need an issue first, and a change written with an AI tool is welcome too. Please run the checks and read the diff yourself before you send it.

## Things to talk about first

diff-fold only changes how the result of an edit is drawn (see What it can reach in the README): no files written, no network, nothing above the prompt and no key binding. That is on purpose. If you have an idea that would change that, or make it a lot bigger, tell me first. It doesn't mean the idea is unwelcome. A good idea can change my mind, so open an issue or a discussion and let's talk.

If you find a way to make diff-fold hide a change you should have seen, please don't post it in public. Use the repository's private security report instead (the Security tab, "Report a vulnerability"). [SECURITY.md](SECURITY.md) says what counts.

## How we talk

Let's be kind to each other and assume good intent. Questions of any kind are welcome, and so is friendly disagreement. Unkind words, insults and personal attacks have no place here. I'll remove such comments and, if it comes to that, stop the person from writing here.

## What to expect

I read every issue and pull request, and I answer each one, starting with a thank you. I'm one person, so it can take a while. If your change goes in, I'll ask whether you'd like to be named, and then your name goes into its CHANGELOG entry and into the Thank you section below. Contributions are under the MIT license of the repository.

## Thank you

Everyone who helps and would like to be named is listed here. Thank you for helping us make diff-fold better.
