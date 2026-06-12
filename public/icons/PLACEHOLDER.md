# Icon Placeholders

The PNG icon files (`icon-192.png` and `icon-512.png`) in this directory are placeholder files.

To generate proper app icons, run:

```bash
node scripts/generate-icons.js
```

This requires `sharp` to be installed:

```bash
npm install --save-dev sharp
```

The script will generate proper PNG icons from `icon.svg`.
