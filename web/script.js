// ==================== SMOOTH SCROLL ==================== 

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }
}

// ==================== INTERSECTION OBSERVER (animaciones) ==================== 

const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observar elementos para animaciones
document.querySelectorAll(
  '.feature-card, .step, .spec-column, .technical-stack'
).forEach(el => {
  el.classList.add('animate-on-scroll');
  observer.observe(el);
});

// CSS para animación on scroll
const style = document.createElement('style');
style.textContent = `
  .animate-on-scroll {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.6s ease-out, transform 0.6s ease-out;
  }
  
  .animate-on-scroll.visible {
    opacity: 1;
    transform: translateY(0);
  }
`;
document.head.appendChild(style);

// ==================== NAVBAR BEHAVIOR ==================== 

let lastScrollTop = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  if (scrollTop > 50) {
    navbar.style.borderBottomColor = 'rgba(42, 42, 42, 0.5)';
  } else {
    navbar.style.borderBottomColor = '#2a2a2a';
  }
  
  lastScrollTop = scrollTop;
});

// ==================== ACTIVE NAV LINK ==================== 

const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  const scrollPosition = window.scrollY;
  
  navLinks.forEach(link => {
    const sectionId = link.getAttribute('href').substring(1);
    const section = document.getElementById(sectionId);
    
    if (section) {
      const sectionTop = section.offsetTop - 100;
      const sectionBottom = sectionTop + section.offsetHeight;
      
      if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
        navLinks.forEach(l => l.style.color = 'var(--text-secondary)');
        link.style.color = 'var(--accent)';
      }
    }
  });
});

// ==================== BUTTON RIPPLE EFFECT ==================== 

document.querySelectorAll('.btn').forEach(button => {
  button.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.5);
      left: ${x}px;
      top: ${y}px;
      pointer-events: none;
      animation: ripple-animation 0.6s ease-out;
    `;
    
    // Solo agregar si el botón no tiene position relative
    if (getComputedStyle(this).position === 'static') {
      this.style.position = 'relative';
    }
    
    this.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  });
});

// Agregar animación ripple al CSS
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;
document.head.appendChild(rippleStyle);

// ==================== COPY TO CLIPBOARD (para código) ==================== 

document.querySelectorAll('code').forEach(codeBlock => {
  const parent = codeBlock.parentElement;
  
  // Agregar tooltip de click
  codeBlock.style.cursor = 'pointer';
  codeBlock.title = 'Click para copiar';
  
  codeBlock.addEventListener('click', () => {
    const text = codeBlock.textContent;
    navigator.clipboard.writeText(text).then(() => {
      const originalText = codeBlock.textContent;
      codeBlock.textContent = '✓ Copiado';
      
      setTimeout(() => {
        codeBlock.textContent = originalText;
      }, 2000);
    });
  });
});

// ==================== PERFORMANCE: Lazy load images (si existen) ==================== 

if ('IntersectionObserver' in window) {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        imageObserver.unobserve(img);
      }
    });
  });
  
  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
}

// ==================== MOBILE MENU (si se agrega después) ==================== 

function initMobileMenu() {
  const menuButton = document.querySelector('.mobile-menu-button');
  const navLinks = document.querySelector('.nav-links');
  
  if (menuButton) {
    menuButton.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
    
    // Cerrar menú al hacer click en un link
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
      });
    });
  }
}

initMobileMenu();

// ==================== ANALYTICS STUB ==================== 

// Si quieres agregar analytics (Google Analytics, etc)
// function trackEvent(eventName, eventData) {
//   if (window.gtag) {
//     gtag('event', eventName, eventData);
//   }
// }

// ==================== ACCESSIBILITY ==================== 

// Mejorar accesibilidad de botones
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      btn.click();
      e.preventDefault();
    }
  });
});

// ==================== PRELOAD OPTIMIZATION ==================== 

// Preconectar a recursos externos (si aplica)
// document.head.insertAdjacentHTML('beforeend', '<link rel="preconnect" href="https://api.github.com">');

// ==================== CONSOLE LOG ==================== 

console.log('%c⚡ Hit Tracker', 'color: #ff4444; font-size: 18px; font-weight: bold;');
console.log(
  '%cSistema IoT de monitoreo para boxeo\n' +
  '%cÓdigo abierto • MIT License\n' +
  '%cGitHub: https://github.com/adanoliva/hit-tracker',
  'color: #a0a0a0; font-size: 12px;',
  'color: #808080; font-size: 11px;',
  'color: #c0c0c0; font-size: 12px; text-decoration: underline;'
);

// ==================== SERVICE WORKER (PWA - opcional) ==================== 

if ('serviceWorker' in navigator) {
  // Descomentar para habilitar PWA
  // navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW error:', err));
}


// Detectar si es primera visita
function isFirstVisit() {
  if (!localStorage.getItem('hasVisited')) {
    localStorage.setItem('hasVisited', 'true');
    return true;
  }
  return false;
}

// Log de primera visita (para analytics)
if (isFirstVisit()) {
  console.log('👋 Primera visita detectada');
}
