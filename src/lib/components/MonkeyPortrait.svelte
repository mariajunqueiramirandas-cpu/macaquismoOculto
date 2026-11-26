<script lang="ts">
  import { portraitSheets } from '#lib/portraits.ts';

  let { avatar }: { avatar: number } = $props();
  const sheet = $derived(portraitSheets[Math.floor(avatar / 4)]);
</script>

<span
  aria-hidden="true"
  class="portrait crop-{avatar % 4}"
  style:--portrait-image="url(/artes/macacos-{sheet}.webp)"
></span>

<style>
  .portrait {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    background-image: var(--portrait-image);
    background-size: 200% 200%;
    background-repeat: no-repeat;
  }

  .crop-0 { background-position: left top; }
  .crop-1 { background-position: right top; }
  .crop-2 { background-position: left bottom; }
  .crop-3 { background-position: right bottom; }
</style>
