<script setup lang="ts">
defineProps<{ name: string }>()
const paths: Record<string, string> = {
  passport: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2.2"/><path d="M6 16c.8-1.6 4.2-1.6 5 0M14 9h4M14 13h4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v1a4 4 0 0 0 3 3.8M17 6h3v1a4 4 0 0 1-3 3.8M9 20h6M12 14v6"/>',
  infoI: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.4 19.6l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4.6 14H4a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 11 3.6V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1"/>',
  shield: '<path d="M12 3l8 3v6c0 4.4-3.2 7.9-8 9-4.8-1.1-8-4.6-8-9V6l8-3Z"/>',
  people: '<path d="M16 19v-1.5a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3V19"/><circle cx="9.5" cy="8" r="3.2"/><path d="M18 8h4M20 6v4"/>',
  medal: '<circle cx="12" cy="9" r="4.5"/><path d="M8.5 13 7 21l5-2.5L17 21l-1.5-8"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  chat: '<path d="M4 5h16v11H8l-4 4V5Z"/><path d="M8 9h8M8 12.5h5"/>',
  pencil: '<path d="M4 20h4L19.5 8.5a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5V20Z"/><path d="M14.5 6.5l3.5 3.5"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 4.5 1.4 6.2 2 7H4c.6-.8 2-2.5 2-7Z"/><path d="M9.5 19a2.5 2.5 0 0 0 5 0"/>',
  trash: '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.8 12.1a2 2 0 0 1-2 1.9H9.8a2 2 0 0 1-2-1.9L7 7"/><path d="M10 11v6M14 11v6"/>',
  download: '<path d="M12 4v11m0 0 4-4m-4 4-4-4"/><path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.3"/>'
}
</script>
<template>
  <svg viewBox="0 0 24 24" v-html="paths[name] || paths.infoI" />
</template>
