import React, { useState, useEffect, useRef } from 'react';
import { Home, User, FolderGit2, Mail, Code2, Github, ExternalLink, X, Database, Dna, Cpu } from 'lucide-react';
// REQUIRES: npm install ogl
import { Mesh, Program, Renderer, Triangle, Vec3 } from 'ogl';

/**
 * ============================================================================
 * 1. GLOBAL STYLES (Fixed Z-Index & Backgrounds)
 * ============================================================================
 */
const GlobalStyles = () => (
  <style>{`
    * { box-sizing: border-box; }
    body, html { 
      margin: 0; padding: 0; width: 100%; height: 100%; 
      overflow: hidden; 
      background: transparent; /* FIX: Transparent so we can see the Orb layer */
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
    }
    
    /* Animations */
    @keyframes electric-pulse {
      0% { box-shadow: 0 0 5px #7df9ff, inset 0 0 5px #7df9ff; border-color: rgba(125, 249, 255, 0.5); }
      50% { box-shadow: 0 0 20px #7df9ff, inset 0 0 10px #7df9ff; border-color: rgba(125, 249, 255, 1); }
      100% { box-shadow: 0 0 5px #7df9ff, inset 0 0 5px #7df9ff; border-color: rgba(125, 249, 255, 0.5); }
    }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
    
    /* Scrollbar Hiding */
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

/**
 * ============================================================================
 * 2. ORB BACKGROUND (Fixed Visibility)
 * ============================================================================
 */
function Orb({ hue = 270, hoverIntensity = 0.2, rotateOnHover = true, forceHoverState = false, backgroundColor = '#000000' }) {
  const ctnDom = useRef(null);

  useEffect(() => {
    const container = ctnDom.current;
    if (!container) return;

    // Initialize OGL Renderer
    const renderer = new Renderer({ alpha: true, premultipliedAlpha: false });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    
    const vert = `precision highp float; attribute vec2 position; attribute vec2 uv; varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;
    
    const frag = `
      precision highp float;
      uniform float iTime;
      uniform vec3 iResolution;
      uniform float hue;
      uniform float hover;
      uniform float rot;
      uniform float hoverIntensity;
      uniform vec3 backgroundColor;
      varying vec2 vUv;

      vec3 rgb2yiq(vec3 c) { float y = dot(c, vec3(0.299, 0.587, 0.114)); float i = dot(c, vec3(0.596, -0.274, -0.322)); float q = dot(c, vec3(0.211, -0.523, 0.312)); return vec3(y, i, q); }
      vec3 yiq2rgb(vec3 c) { float r = c.x + 0.956 * c.y + 0.621 * c.z; float g = c.x - 0.272 * c.y - 0.647 * c.z; float b = c.x - 1.106 * c.y + 1.703 * c.z; return vec3(r, g, b); }
      vec3 adjustHue(vec3 color, float hueDeg) { float hueRad = hueDeg * 3.14159265 / 180.0; vec3 yiq = rgb2yiq(color); float cosA = cos(hueRad); float sinA = sin(hueRad); float i = yiq.y * cosA - yiq.z * sinA; float q = yiq.y * sinA + yiq.z * cosA; yiq.y = i; yiq.z = q; return yiq2rgb(yiq); }
      
      vec3 hash33(vec3 p3) { p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787)); p3 += dot(p3, p3.yxz + 19.19); return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx); }
      
      float snoise3(vec3 p) { 
        const float K1 = 0.333333333; const float K2 = 0.166666667; 
        vec3 i = floor(p + (p.x + p.y + p.z) * K1); 
        vec3 d0 = p - (i - (i.x + i.y + i.z) * K2); 
        vec3 e = step(vec3(0.0), d0 - d0.yzx); 
        vec3 i1 = e * (1.0 - e.zxy); vec3 i2 = 1.0 - e.zxy * (1.0 - e); 
        vec3 d1 = d0 - (i1 - K2); vec3 d2 = d0 - (i2 - K1); vec3 d3 = d0 - 0.5; 
        vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0); 
        vec4 n = h * h * h * h * vec4(dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0))); 
        return dot(vec4(31.316), n); 
      }
      
      vec4 extractAlpha(vec3 colorIn) { float a = max(max(colorIn.r, colorIn.g), colorIn.b); return vec4(colorIn.rgb / (a + 1e-5), a); }
      
      const vec3 baseColor1 = vec3(0.611765, 0.262745, 0.996078); 
      const vec3 baseColor2 = vec3(0.298039, 0.760784, 0.913725); 
      const vec3 baseColor3 = vec3(0.062745, 0.078431, 0.600000); 
      const float innerRadius = 0.6; 
      const float noiseScale = 0.65;
      
      float light1(float intensity, float attenuation, float dist) { return intensity / (1.0 + dist * attenuation); }
      float light2(float intensity, float attenuation, float dist) { return intensity / (1.0 + dist * dist * attenuation); }
      
      vec4 draw(vec2 uv) { 
        vec3 color1 = adjustHue(baseColor1, hue); 
        vec3 color2 = adjustHue(baseColor2, hue); 
        vec3 color3 = adjustHue(baseColor3, hue); 
        float ang = atan(uv.y, uv.x); float len = length(uv); float invLen = len > 0.0 ? 1.0 / len : 0.0; 
        float bgLuminance = dot(backgroundColor, vec3(0.299, 0.587, 0.114)); 
        
        float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5; 
        float r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0); 
        float d0 = distance(uv, (r0 * invLen) * uv); 
        float v0 = light1(1.0, 10.0, d0); 
        v0 *= smoothstep(r0 * 1.05, r0, len); 
        float innerFade = smoothstep(r0 * 0.8, r0 * 0.95, len); 
        v0 *= mix(innerFade, 1.0, bgLuminance * 0.7); 
        
        float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5; 
        float a = iTime * -1.0; 
        vec2 pos = vec2(cos(a), sin(a)) * r0; 
        float d = distance(uv, pos); 
        float v1 = light2(1.5, 5.0, d); 
        v1 *= light1(1.0, 50.0, d0); 
        float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len); 
        float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len); 
        vec3 colBase = mix(color1, color2, cl); 
        float fadeAmount = mix(1.0, 0.1, bgLuminance); 
        vec3 darkCol = mix(color3, colBase, v0); 
        darkCol = (darkCol + v1) * v2 * v3; 
        darkCol = clamp(darkCol, 0.0, 1.0); 
        vec3 lightCol = (colBase + v1) * mix(1.0, v2 * v3, fadeAmount); 
        lightCol = mix(backgroundColor, lightCol, v0); 
        lightCol = clamp(lightCol, 0.0, 1.0); 
        vec3 finalCol = mix(darkCol, lightCol, bgLuminance); 
        return extractAlpha(finalCol); 
      }
      
      vec4 mainImage(vec2 fragCoord) { 
        vec2 center = iResolution.xy * 0.5; 
        float size = min(iResolution.x, iResolution.y); 
        vec2 uv = (fragCoord - center) / size * 2.0; 
        float angle = rot; 
        float s = sin(angle); float c = cos(angle); 
        uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y); 
        uv.x += hover * hoverIntensity * 0.1 * sin(uv.y * 10.0 + iTime); 
        uv.y += hover * hoverIntensity * 0.1 * sin(uv.x * 10.0 + iTime); 
        return draw(uv); 
      }
      
      void main() { 
        vec2 fragCoord = vUv * iResolution.xy; 
        vec4 col = mainImage(fragCoord); 
        gl_FragColor = vec4(col.rgb * col.a, col.a); 
      }
    `;

    const program = new Program(gl, {
      vertex: vert,
      fragment: frag,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Vec3(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height) },
        hue: { value: hue },
        hover: { value: 0 },
        rot: { value: 0 },
        hoverIntensity: { value: hoverIntensity },
        backgroundColor: { value: hexToVec3(backgroundColor) }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
      if (!container) return;
      // Fixed at 1 for performance on your Mac
      const dpr = 1; 
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width * dpr, height * dpr);
      gl.canvas.style.width = width + 'px';
      gl.canvas.style.height = height + 'px';
      program.uniforms.iResolution.value.set(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    let lastTime = 0;
    let currentRot = 0;
    const rotationSpeed = 0.3;
    let targetHover = 0;

    const handleMouseMove = e => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const width = rect.width;
      const height = rect.height;
      const size = Math.min(width, height);
      const centerX = width / 2;
      const centerY = height / 2;
      const uvX = ((x - centerX) / size) * 2.0;
      const uvY = ((y - centerY) / size) * 2.0;
      if (Math.sqrt(uvX * uvX + uvY * uvY) < 0.8) targetHover = 1; else targetHover = 0;
    };
    
    // ATTACH TO WINDOW TO FIX INTERACTION
    window.addEventListener('mousemove', handleMouseMove);

    let rafId;
    const update = t => {
      rafId = requestAnimationFrame(update);
      const dt = (t - lastTime) * 0.001;
      lastTime = t;
      program.uniforms.iTime.value = t * 0.001;
      program.uniforms.hue.value = hue;
      program.uniforms.hoverIntensity.value = hoverIntensity;
      program.uniforms.backgroundColor.value = hexToVec3(backgroundColor);
      const effectiveHover = forceHoverState ? 1 : targetHover;
      program.uniforms.hover.value += (effectiveHover - program.uniforms.hover.value) * 0.1;
      if (rotateOnHover && effectiveHover > 0.5) currentRot += dt * rotationSpeed;
      program.uniforms.rot.value = currentRot;
      renderer.render({ scene: mesh });
    };
    rafId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (gl.canvas && container.contains(gl.canvas)) container.removeChild(gl.canvas);
    };
  }, [hue, hoverIntensity, rotateOnHover, forceHoverState, backgroundColor]);

  // FIX: Z-Index 0 + Black Background here, not on body
  return (
    <div 
      ref={ctnDom} 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        zIndex: 0, /* ORB IS BOTTOM LAYER */
        background: '#000000' /* BACKGROUND COLOR LIVES HERE */
      }} 
    />
  );
}

// Helpers
function hslToRgb(h, s, l) { let r, g, b; if (s === 0) { r = g = b = l; } else { const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }; const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q; r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3); } return new Vec3(r, g, b); }
function hexToVec3(color) { if (color.startsWith('#')) { const r = parseInt(color.slice(1, 3), 16) / 255; const g = parseInt(color.slice(3, 5), 16) / 255; const b = parseInt(color.slice(5, 7), 16) / 255; return new Vec3(r, g, b); } return new Vec3(0, 0, 0); }

/**
 * ============================================================================
 * 3. TRUE FOCUS (Centered & Fitted Fix)
 * ============================================================================
 */
const TrueFocus = () => {
  const words = ['MURRAY', 'WATT'];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setIdx(prev => (prev + 1) % words.length), 2000);
    return () => clearInterval(i);
  }, []);

  return (
    <div style={{ display: 'flex', gap: '3rem', justifyContent: 'center', alignItems: 'center' }}>
      {words.map((w, i) => (
        <div key={i} style={{ position: 'relative', display: 'flex', padding: '40px' }}>
          <span style={{
            fontSize: '5rem', fontWeight: '900', color: 'white',
            filter: i === idx ? 'blur(0)' : 'blur(4px)', 
            opacity: i === idx ? 1 : 0.5,
            transition: 'all 0.5s ease',
            zIndex: 10
          }}>
            {w}
          </span>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            opacity: i === idx ? 1 : 0, transform: i === idx ? 'scale(1)' : 'scale(0.95)',
            transition: 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 25, height: 25, borderTop: '4px solid #a78bfa', borderLeft: '4px solid #a78bfa' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: 25, height: 25, borderTop: '4px solid #a78bfa', borderRight: '4px solid #a78bfa' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: 25, height: 25, borderBottom: '4px solid #a78bfa', borderLeft: '4px solid #a78bfa' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 25, height: 25, borderBottom: '4px solid #a78bfa', borderRight: '4px solid #a78bfa' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * ============================================================================
 * 4. PROJECT MODAL
 * ============================================================================
 */
const ProjectModal = ({ project, onClose }) => {
  if (!project) return null;
  return (
    <div 
      onClick={onClose} 
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.3s ease'
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto', 
          background: 'rgba(15, 15, 20, 0.95)', border: '1px solid #7df9ff', 
          borderRadius: '24px', padding: '40px', animation: 'slideUp 0.3s ease',
          boxShadow: '0 0 30px rgba(125, 249, 255, 0.2)'
        }}
        className="scrollbar-hide"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: 'white', margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
            {project.icon} {project.name}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}><X /></button>
        </div>
        
        <p style={{ color: '#ccc', fontSize: '1.2rem', fontStyle: 'italic', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #333' }}>
           {project.tagline}
        </p>

        <div style={{ color: '#bbb', lineHeight: '1.7', marginBottom: '30px', whiteSpace: 'pre-line' }}>
          {project.description}
        </div>
        
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ color: '#7df9ff', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>Core Tech</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {project.tech.map((t, i) => (
              <span key={i} style={{ padding: '8px 16px', borderRadius: '20px', background: 'rgba(125, 249, 255, 0.1)', color: '#7df9ff', fontSize: '0.9rem', border: '1px solid rgba(125, 249, 255, 0.3)' }}>
                {t}
              </span>
            ))}
          </div>
        </div>
        
        <a href={project.link} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '15px 30px',
          borderRadius: '12px', background: '#7df9ff', color: 'black', textDecoration: 'none', fontWeight: 'bold',
          transition: 'transform 0.2s'
        }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          <Github size={20} /> View Source Code
        </a>
      </div>
    </div>
  );
};

const ElectricBorder = ({ children }) => (
  <div style={{ position: 'relative', padding: '2px', borderRadius: '24px', background: 'linear-gradient(45deg, #7df9ff, transparent, #7df9ff)', animation: 'electric-pulse 3s infinite' }}>
    <div style={{ background: 'rgba(10, 10, 15, 0.95)', borderRadius: '22px', padding: '40px', border: '1px solid #7df9ff' }}>
      {children}
    </div>
  </div>
);

const Folder = ({ projects, onSelectProject }) => {
  const [open, setOpen] = useState(false);

  return (
    <div 
      onClick={() => setOpen(!open)}
      style={{ cursor: 'pointer', transform: 'scale(1.5)', position: 'relative', width: '100px', height: '80px', marginTop: '50px' }}
    >
      <div style={{ position: 'absolute', width: '100px', height: '80px', background: '#6b46c1', borderRadius: '0 10px 10px 10px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ position: 'absolute', bottom: '100%', left: 0, width: '30px', height: '10px', background: '#6b46c1', borderRadius: '5px 5px 0 0' }} />
        
        {projects.map((item, i) => (
          <div 
            key={i} 
            onClick={(e) => {
              e.stopPropagation();
              if(open) onSelectProject(item);
            }}
            style={{
              position: 'absolute', width: '80%', height: '70%', background: i === 0 ? '#fff' : '#e0e0e0',
              left: '10%', bottom: '10%', borderRadius: '5px',
              transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              transform: open 
                ? (i === 0 ? 'translate(-80px, -60px) rotate(-10deg)' : 'translate(80px, -60px) rotate(10deg)')
                : 'translate(0, 0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '6px', fontWeight: 'bold', color: '#333', textAlign: 'center', zIndex: 1,
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)', cursor: open ? 'pointer' : 'default'
            }}
          >
            <div style={{ padding: '2px' }}>
              <div style={{ fontSize: '7px', marginBottom: '2px', color: '#6b46c1' }}>{item.icon}</div>
              {item.name}
            </div>
          </div>
        ))}
        
        <div style={{
          position: 'absolute', width: '100%', height: '100%', background: '#8b5cf6',
          borderRadius: '0 10px 10px 10px', transformOrigin: 'bottom',
          transition: 'transform 0.5s ease',
          transform: open ? 'skewX(-10deg) scaleY(0.4)' : 'skewX(0) scaleY(1)',
          zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {!open && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', letterSpacing: '1px' }}>PROJECTS</span>}
        </div>
      </div>
      <p style={{ position: 'absolute', top: '130%', width: '200%', left: '-50%', textAlign: 'center', color: '#666', fontSize: '10px', opacity: 0.8 }}>
        {open ? 'Select a file to view details' : 'Click folder to open'}
      </p>
    </div>
  );
};

/**
 * ============================================================================
 * 6. MAIN APP
 * ============================================================================
 */
export default function Portfolio() {
  const [active, setActive] = useState('home');
  const [selectedProject, setSelectedProject] = useState(null);

  const projectsData = [
    { 
      name: 'CodeDNA', 
      icon: <Dna size={12} />,
      tagline: 'Visualize Your Codebase\'s Architecture in 3D',
      description: `CodeDNA analyzes your repository's structure, maps file dependencies, and renders an interactive 3D force-directed graph — giving you X-ray vision into your codebase's DNA.
      
      It features AST-based parsing (Tree-sitter) for deep code analysis, detecting circular dependencies (Tarjan's algorithm), and calculating centrality scores (PageRank) to identify architectural risks and "God modules".`,
      tech: ['React 19', 'Three.js', 'Tree-sitter', 'Node.js', 'Express'],
      link: 'https://github.com/mwatt29/CodeDNA' 
    },
    { 
      name: 'AI Copilot', 
      icon: <Cpu size={12} />,
      tagline: 'Local RAG Support Agent (MVP)',
      description: `An end-to-end vertical slice of an AI-powered support copilot. It ingests a knowledge base, embeds chunks using pgvector, and answers tickets using a local LLM (Llama3 via Ollama).
      
      Features a fully containerized backend (Docker), FastAPI for the API layer, and a Streamlit UI for real-time interaction. It implements a complete RAG pipeline from ingestion to retrieval and generation.`,
      tech: ['FastAPI', 'PostgreSQL + pgvector', 'Ollama (Llama3)', 'Docker', 'Streamlit'],
      link: 'https://github.com/mwatt29/ai-support-copilot' 
    }
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <GlobalStyles />
      
      {/* 1. BACKGROUND (Z-INDEX 0) */}
      <Orb hue={270} hoverIntensity={0.5} />
      
      {/* 2. CONTENT (Z-INDEX 10) */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: '20px' }}>
        
        {/* HOME */}
        {active === 'home' && (
          <div style={{ textAlign: 'center', animation: 'slideUp 0.8s ease' }}>
            <TrueFocus />
            <p style={{ marginTop: '30px', color: '#aaa', letterSpacing: '4px', textTransform: 'uppercase', fontSize: '1.2rem' }}>
              Developer • Designer • Creator
            </p>
          </div>
        )}

        {/* ABOUT - CONDENSED VERSION */}
        {active === 'about' && (
          <div style={{ maxWidth: '700px', width: '90%', animation: 'slideUp 0.6s ease' }}>
            <ElectricBorder>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                <User color="#a78bfa" size={32} />
                <h2 style={{ margin: 0, fontSize: '2rem', color: 'white', fontWeight: 800 }}>ABOUT ME</h2>
              </div>
              <div style={{ color: '#d1d5db', fontSize: '1rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <p>
                  I’m a Computer Science student and aspiring software engineer passionate about building robust full-stack applications with clean, responsive user interfaces.
                </p>
                <p>
                  On the frontend, I specialize in component-based architecture using <strong>React, JavaScript, and Tailwind CSS</strong>. On the backend, I design scalable APIs and manage relational databases using <strong>Node.js, Python (FastAPI), and PostgreSQL</strong>.
                </p>
                <p>
                  I prioritize code quality and collaboration using Git/GitHub. Experienced with Docker for containerization, I bring a strong problem-solving mindset and a drive to learn new technologies quickly. I'm looking to explore Cloud technologies and DevOps practices next.
                </p>
              </div>
            </ElectricBorder>
          </div>
        )}

        {/* PROJECTS */}
        {active === 'projects' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'slideUp 0.6s ease' }}>
            <h2 style={{ fontSize: '2.5rem', color: 'white', marginBottom: '40px', fontWeight: 'bold' }}>FEATURED WORK</h2>
            <Folder projects={projectsData} onSelectProject={setSelectedProject} />
          </div>
        )}

        {/* CONTACT */}
        {active === 'contact' && (
          <div style={{ textAlign: 'center', animation: 'slideUp 0.6s ease' }}>
            <h2 style={{ fontSize: '3rem', color: 'white', marginBottom: '40px', fontWeight: 'bold' }}>GET IN TOUCH</h2>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { icon: Mail, label: 'Email', link: 'mailto:wattmurray05@gmail.com' },
                { icon: Github, label: 'GitHub', link: 'https://github.com/mwatt29' },
                { icon: ExternalLink, label: 'LinkedIn', link: 'https://www.linkedin.com/in/murray-watt-a93345305/' }
              ].map((item, i) => (
                <a
                  key={i}
                  href={item.link}
                  target={item.label === 'Email' ? '_self' : '_blank'}
                  rel="noreferrer"
                  style={{ 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                    background: 'rgba(255,255,255,0.05)', padding: '25px', borderRadius: '15px', 
                    border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', width: '120px', textDecoration: 'none',
                    animation: `float 3s ease-in-out infinite ${i * 0.2}s`
                  }}
                >
                  <item.icon size={32} color="#a78bfa" />
                  <span style={{ fontSize: '0.9rem', color: '#ccc', fontWeight: '500' }}>{item.label}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DOCK */}
      <div style={{ 
        position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', 
        display: 'flex', gap: '20px', padding: '15px 30px', background: 'rgba(10,10,20,0.8)', 
        backdropFilter: 'blur(20px)', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)',
        zIndex: 100, boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        {[
          { id: 'home', Icon: Home }, 
          { id: 'about', Icon: User }, 
          { id: 'projects', Icon: FolderGit2 }, 
          { id: 'contact', Icon: Mail }
        ].map((item) => (
          <div 
            key={item.id} 
            onClick={() => setActive(item.id)}
            style={{ 
              cursor: 'pointer', padding: '10px', borderRadius: '12px',
              background: active === item.id ? 'rgba(255,255,255,0.1)' : 'transparent',
              transition: 'all 0.3s ease', transform: active === item.id ? 'scale(1.1)' : 'scale(1)'
            }}
          >
            <item.Icon size={24} color={active === item.id ? '#a78bfa' : 'white'} />
          </div>
        ))}
      </div>

      <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
    </div>
  );
}