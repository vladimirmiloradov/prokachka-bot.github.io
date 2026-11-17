(() => {
  try {
    const root = document.documentElement;
    const themeKey = 'rostyasha_theme';
    const timeKey = 'korzhany_hub_time';
    const enabledKey = 'korzhany_wallpaper_enabled_v497';
    const dimKey = 'korzhany_wallpaper_dim_v497';
    const blurKey = 'korzhany_wallpaper_blur_v497';
    const satKey = 'korzhany_wallpaper_sat_v497';
    const bootKey = 'korzhany_wallpaper_boot_v498';
    const legacy={pink:'sakura',wine:'sakura',aurora:'emerald',mint:'emerald'};
    let theme = legacy[localStorage.getItem(themeKey)] || localStorage.getItem(themeKey) || 'royal';
    if (theme === 'sakura') { theme = 'royal'; localStorage.setItem(themeKey, theme); }
    if (!/^(sakura|neon|emerald|obsidian|royal|amber)$/.test(theme)) theme='royal';
    const time = localStorage.getItem(timeKey)==='night'?'night':'day';
    const tint={sakura:'58,3,10',neon:'5,10,18',emerald:'6,16,13',obsidian:'8,9,12',royal:'12,7,20',amber:'17,12,7'}[theme] || '8,9,12';
    const num=(key,min,max,fallback)=>{const n=Number(localStorage.getItem(key));return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback};
    root.classList.add('theme-'+theme,'kor-time-'+time);
    root.dataset.korTheme=theme; root.dataset.korTime=time;
    root.style.setProperty('--kor-wallpaper-tint-rgb',tint);
    root.style.setProperty('--kor-wallpaper-dim-alpha',String(Math.min(.88,num(dimKey,0,90,48)/100)));
    root.style.setProperty('--kor-wallpaper-blur',num(blurKey,0,20,1)+'px');
    root.style.setProperty('--kor-wallpaper-saturation',String(num(satKey,40,180,100)/100));
    if (localStorage.getItem(enabledKey)==='1') {
      root.classList.add('kor-custom-wallpaper');
      const boot = localStorage.getItem(bootKey);
      if (boot) {
        root.style.setProperty('--kor-wallpaper-boot-url',`url("${boot}")`);
        root.classList.add('kor-wallpaper-boot-ready');
      } else {
        root.classList.add('kor-wallpaper-pending');
      }
    }
  } catch (_) {}
})();
