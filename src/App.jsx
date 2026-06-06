import React, { useState, useEffect } from 'react';
import { 
  Camera, Plus, Trash2, Edit3, Link as LinkIcon, Eye, 
  PlayCircle, Grid, Download, ArrowRight, Lock, 
  Pause, Play, Image as ImageIcon, CheckCircle, X, Loader2, RefreshCw,
  Upload, Save, FolderUp, MessageCircle
} from 'lucide-react';

// ============================================
// CONFIGURAÇÃO DO GITHUB
// ============================================
// COLOQUE SEUS DADOS DO GITHUB AQUI:
const GITHUB_CONFIG = {
  owner: 'lucas-rocha-ramos',     // Ex: 'joaosilva'
  repo: 'registre-album',          // Ex: 'meus-albuns'
  token: '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',        // Gerar em: Settings > Developer settings > Personal access tokens
  branch: 'main'                     // ou 'master'
};

// Função para atualizar metatags para compartilhamento
function updateMetaTags(album) {
  if (!album) return;
  
  const photoUrl = album.profileImage || (album.photos && album.photos[0]) || '';
  const title = album.clientName || 'Álbum Fotográfico';
  const description = album.subtitle || 'Veja minhas fotos neste álbum exclusivo';
  
  // Atualiza o título da página
  document.title = title;
  
  // Atualiza meta tags existentes ou cria novas
  const metaTags = [
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: photoUrl },
    { property: 'og:url', content: window.location.href },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: title },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: photoUrl },
    { name: 'description', content: description }
  ];
  
  metaTags.forEach(tag => {
    let meta;
    if (tag.property) {
      meta = document.querySelector(`meta[property="${tag.property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', tag.property);
        document.head.appendChild(meta);
      }
    } else if (tag.name) {
      meta = document.querySelector(`meta[name="${tag.name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', tag.name);
        document.head.appendChild(meta);
      }
    }
    
    if (meta) {
      meta.setAttribute('content', tag.content);
    }
  });
}

// Função para fazer upload de imagem para o GitHub
async function uploadImageToGitHub(imageBase64, fileName, albumId) {
  try {
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const path = `albums/${albumId}/${fileName}`;
    
    let sha = null;
    try {
      const checkResponse = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`, {
        headers: {
          'Authorization': `token ${GITHUB_CONFIG.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (checkResponse.ok) {
        const data = await checkResponse.json();
        sha = data.sha;
      }
    } catch (e) {}
    
    const payload = {
      message: `Upload ${fileName} para álbum ${albumId}`,
      content: base64Data,
      branch: GITHUB_CONFIG.branch
    };
    if (sha) payload.sha = sha;
    
    const response = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_CONFIG.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
    
    const data = await response.json();
    return `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${path}`;
  } catch (error) {
    console.error('Erro no upload:', error);
    return null;
  }
}

const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbxUZCQSf2z9U5581WIgOZ3zhOYIry5ux3BRkf1O-YgKoL_GXu3AvgqDxe8jzOmGVcBS/exec';

const saveAlbumToSheets = async (album) => {
  try {
    const response = await fetch(SHEETS_API_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        id: album.shortId,
        album: album
      })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Erro ao salvar:', error);
    return false;
  }
};

const loadAlbumFromSheets = async (shortId) => {
  try {
    const response = await fetch(`${SHEETS_API_URL}?id=${shortId}`);
    const data = await response.json();
    if (data.success && data.album) {
      return data.album;
    }
    return null;
  } catch (error) {
    console.error('Erro ao carregar:', error);
    return null;
  }
};

const loadAllAlbumsFromSheets = async () => {
  try {
    const response = await fetch(SHEETS_API_URL);
    const data = await response.json();
    if (data.success && data.albums) {
      return data.albums;
    }
    return {};
  } catch (error) {
    console.error('Erro ao carregar todos:', error);
    return {};
  }
};

const generateShortId = () => {
  return Math.random().toString(36).substring(2, 8);
};

export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  const [albums, setAlbums] = useState(() => {
    const saved = localStorage.getItem('studio_albums_v3');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('studio_albums_v3', JSON.stringify(albums));
  }, [albums]);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    
    let meta = document.querySelector('meta[name="referrer"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = "referrer";
      meta.content = "no-referrer";
      document.head.appendChild(meta);
    }

    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const loadSheetsAlbums = async () => {
      const sheetsAlbums = await loadAllAlbumsFromSheets();
      const localAlbums = JSON.parse(localStorage.getItem('studio_albums_v3') || '[]');
      
      const mergedAlbums = [...localAlbums];
      for (const [id, info] of Object.entries(sheetsAlbums)) {
        if (!mergedAlbums.find(a => a.shortId === id)) {
          const fullAlbum = await loadAlbumFromSheets(id);
          if (fullAlbum) {
            mergedAlbums.push(fullAlbum);
          }
        }
      }
      if (mergedAlbums.length > localAlbums.length) {
        setAlbums(mergedAlbums);
      }
    };
    loadSheetsAlbums();
  }, []);

  if (hash.startsWith('#/album/')) {
    const shortId = hash.replace('#/album/', '');
    return <AlbumLoader shortId={shortId} />;
  }

  if (hash === '#new') {
    return <AdminEditor onSave={(newAlbum) => {
      setAlbums([newAlbum, ...albums]);
      window.location.hash = '';
    }} onCancel={() => window.location.hash = ''} />;
  }

  if (hash.startsWith('#edit_')) {
    const albumId = hash.replace('#edit_', '');
    const album = albums.find(a => a.id === albumId);
    return <AdminEditor album={album} onSave={(updated) => {
      setAlbums(albums.map(a => a.id === updated.id ? updated : a));
      window.location.hash = '';
    }} onCancel={() => window.location.hash = ''} />;
  }

  return <AdminDashboard albums={albums} setAlbums={setAlbums} />;
}

function ClientApp({ album }) {
  const [pinInput, setPinInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(!album.pin);
  const [pinError, setPinError] = useState(false);
  
  const [activeTab, setActiveTab] = useState('stories'); 
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
  const [isStoryPlaying, setIsStoryPlaying] = useState(true);
  
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  const [bgImageIdx, setBgImageIdx] = useState(0);
  const featuredList = album.featuredPhotos?.length > 0 
    ? album.featuredPhotos.map(idx => album.photos[idx]).filter(Boolean)
    : album.photos?.slice(0, 5) || [];

  // Atualiza metatags quando o álbum é carregado
  useEffect(() => {
    if (album) {
      updateMetaTags(album);
    }
  }, [album]);

  useEffect(() => {
    if (!isAuthenticated && featuredList.length > 1) {
      const bgInterval = setInterval(() => {
        setBgImageIdx(prev => (prev + 1) % featuredList.length);
      }, 5000);
      return () => clearInterval(bgInterval);
    }
  }, [isAuthenticated, featuredList]);

  useEffect(() => {
    let interval;
    if (activeTab === 'stories' && isStoryPlaying && album.photos?.length > 0) {
      interval = setInterval(() => {
        setCurrentStoryIdx((prev) => {
          if (prev < album.photos.length - 1) {
            return prev + 1;
          } else {
            setIsStoryPlaying(false);
            setActiveTab('gallery');
            return 0;
          }
        });
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [activeTab, isStoryPlaying, album.photos]);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === album.pin) {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  const handleDownloadRedirect = () => {
    if (album.googleDriveUrl) {
      window.open(album.googleDriveUrl, '_blank', 'noopener,noreferrer');
    } else {
      alert('Link de download não configurado.');
    }
  };

  const handleWhatsAppContact = () => {
    if (album.whatsappNumber && album.whatsappNumber.trim() !== '') {
      let phone = album.whatsappNumber.replace(/\D/g, '');
      if (!phone.startsWith('55')) phone = '55' + phone;
      const message = encodeURIComponent(`Olá! Vi seu álbum "${album.clientName}" e gostaria de saber mais informações.`);
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    } else {
      alert('Número de WhatsApp não disponível para este álbum.');
    }
  };

  const hasWhatsApp = album.whatsappNumber && album.whatsappNumber.trim() !== '';

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center font-['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'] p-4 relative overflow-hidden">
        {featuredList.map((photoUrl, index) => (
          <div 
            key={index}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out scale-105 blur-[3px]"
            style={{ 
              backgroundImage: `url(${photoUrl})`,
              opacity: index === bgImageIdx ? 0.35 : 0,
              zIndex: 1
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 z-[2]" />
        
        <div className="max-w-md w-full bg-black/40 backdrop-blur-xl border border-white/15 rounded-3xl p-8 text-center shadow-2xl relative z-10">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#d4af37] shadow-2xl mx-auto mb-4 flex-shrink-0 bg-neutral-900">
            <img 
              src={album.profileImage || album.photos[0] || 'https://images.unsplash.com/photo-1516205651411-aef33a44f7c2?q=80&w=150&auto=format&fit=crop'} 
              alt="Capa" 
              className="w-full h-full object-cover" 
            />
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight mb-1 text-white drop-shadow-md">{album.clientName}</h2>
          <p className="text-[#d4af37] text-xs uppercase tracking-widest font-semibold mb-6">{album.subtitle || 'Álbum Privado'}</p>
          
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-6 flex items-center gap-3 justify-center text-gray-300 text-sm">
            <Lock size={16} className="text-[#d4af37]" />
            <span>Introduza o PIN de acesso para visualizar o álbum</span>
          </div>
          
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Digite o PIN secreto"
              className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-center text-xl tracking-widest outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent transition-all placeholder:text-gray-500 text-white"
            />
            {pinError && <p className="text-red-500 text-xs font-medium">PIN inválido. Tente novamente.</p>}
            <button type="submit" className="w-full bg-[#d4af37] hover:bg-[#c4a137] text-black font-bold p-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] duration-200">
              Desbloquear Galeria <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] text-white font-['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'] pb-12 relative">
      
      <div className="relative w-full h-64 sm:h-80 lg:h-96 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center blur-sm opacity-40 scale-105"
          style={{ backgroundImage: `url(${album.profileImage || album.photos[0]})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 flex flex-row items-center justify-start gap-4 sm:gap-6 text-left">
          <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-[#d4af37] shadow-xl flex-shrink-0 bg-neutral-900">
            <img 
              src={album.profileImage || album.photos[0] || 'https://images.unsplash.com/photo-1516205651411-aef33a44f7c2?q=80&w=150&auto=format&fit=crop'} 
              alt="Capa do Álbum" 
              className="w-full h-full object-cover" 
            />
          </div>
          <div className="flex flex-col items-start justify-center">
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-1 sm:mb-2 tracking-tight">
              {album.clientName}
            </h1>
            <p className="text-[#d4af37] text-xs sm:text-base uppercase tracking-widest font-medium">
              {album.subtitle || 'Álbum Fotográfico'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex justify-center border-b border-white/10 gap-8">
          <button 
            onClick={() => {
              setActiveTab('stories');
              setCurrentStoryIdx(0);
              setIsStoryPlaying(true);
            }}
            className={`pb-4 text-sm font-semibold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${activeTab === 'stories' ? 'border-[#d4af37] text-[#d4af37]' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            <PlayCircle size={16} /> Animação Stories
          </button>
          <button 
            onClick={() => setActiveTab('gallery')}
            className={`pb-4 text-sm font-semibold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${activeTab === 'gallery' ? 'border-[#d4af37] text-[#d4af37]' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            <Grid size={16} /> Aba Galeria
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-gray-200">Galeria ({album.photos?.length || 0})</h2>
          <div className="flex gap-3">
            {hasWhatsApp && (
              <button 
                onClick={handleWhatsAppContact}
                className="flex items-center gap-2 text-sm bg-[#25D366] hover:bg-[#20b859] text-white font-semibold px-5 py-2.5 rounded-full transition-all shadow-md active:scale-95"
              >
                <MessageCircle size={16} /> WhatsApp
              </button>
            )}
            <button 
              onClick={handleDownloadRedirect}
              className="flex items-center gap-2 text-sm bg-[#d4af37] hover:bg-[#c4a137] text-black font-semibold px-5 py-2.5 rounded-full transition-all shadow-md active:scale-95"
            >
              <Download size={16} /> Baixar Fotos
            </button>
          </div>
        </div>

        {album.photos && album.photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {album.photos.map((photo, idx) => (
              <div 
                key={idx} 
                onClick={() => setLightboxPhoto(photo)}
                className="relative group cursor-pointer aspect-square rounded-xl overflow-hidden bg-gray-900 border border-white/10"
              >
                <img 
                  src={photo} 
                  alt={`Foto ${idx + 1}`} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                  <Eye size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">
            <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhuma foto disponível neste álbum.</p>
          </div>
        )}
      </div>

      {activeTab === 'stories' && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex items-center justify-center sm:p-6 animate-fadeIn">
          {album.photos && album.photos.length > 0 && (
            <div className="relative w-full h-full sm:max-w-[400px] sm:max-h-[90vh] sm:rounded-[40px] bg-black overflow-hidden shadow-2xl sm:border-[8px] border-neutral-900 flex flex-col sm:ring-1 sm:ring-white/10">
              
              <div className="absolute top-4 sm:top-5 inset-x-3 sm:inset-x-5 flex gap-1 z-30 px-1">
                {album.photos.map((_, idx) => (
                  <div key={idx} className="h-[2px] sm:h-[3px] flex-1 bg-white/30 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-white transition-all duration-300 ${
                        idx < currentStoryIdx ? 'w-full' : idx === currentStoryIdx ? (isStoryPlaying ? 'w-full duration-[4000ms] linear' : 'w-[50%]') : 'w-0'
                      }`}
                      style={{
                        transitionProperty: idx === currentStoryIdx && isStoryPlaying ? 'width' : 'none',
                        transitionTimingFunction: 'linear'
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="absolute top-8 sm:top-9 inset-x-4 sm:inset-x-5 flex justify-between items-center z-30 px-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border border-white/20 shadow-sm bg-neutral-800">
                    <img src={album.profileImage || album.photos[0]} alt="Perfil" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col drop-shadow-md">
                    <span className="text-sm font-semibold text-white tracking-tight leading-none mb-0.5">
                      {album.clientName}
                    </span>
                    <span className="text-[10px] sm:text-xs text-white/80 font-medium leading-none">
                      {album.subtitle || 'Álbum Fotográfico'}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-4 sm:gap-3 items-center">
                  <button onClick={() => { setIsStoryPlaying(!isStoryPlaying); }} className="text-white hover:opacity-70 transition-opacity drop-shadow-md">
                    {isStoryPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                  </button>
                  <button onClick={() => { setIsStoryPlaying(false); setActiveTab('gallery'); }} className="text-white hover:opacity-70 transition-opacity drop-shadow-md">
                    <X size={26} />
                  </button>
                </div>
              </div>

              <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950">
                <img src={album.photos[currentStoryIdx]} alt={`Story ${currentStoryIdx + 1}`} className="w-full h-full object-contain" />
              </div>

              <div className="absolute inset-0 z-20 flex pt-20">
                <div className="w-[30%] h-full cursor-w-resize" onClick={() => { if (currentStoryIdx > 0) setCurrentStoryIdx(currentStoryIdx - 1); }} />
                <div className="w-[70%] h-full cursor-e-resize" onClick={() => { 
                  if (currentStoryIdx < album.photos.length - 1) { 
                    setCurrentStoryIdx(currentStoryIdx + 1); 
                  } else { 
                    setIsStoryPlaying(false); 
                    setActiveTab('gallery'); 
                  } 
                }} />
              </div>

              {/* Botão WhatsApp no rodapé do stories */}
              {hasWhatsApp && (
                <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center px-4">
                  <button
                    onClick={handleWhatsAppContact}
                    className="bg-[#25D366] hover:bg-[#20b859] text-white font-semibold py-3 px-6 rounded-full flex items-center gap-2 transition-all shadow-lg active:scale-95"
                  >
                    <MessageCircle size={20} />
                    Falar com Fotógrafo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {lightboxPhoto && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <button 
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-6 right-6 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all border border-white/10 z-50"
          >
            <X size={24} />
          </button>
          <div className="max-w-5xl max-h-[85vh] flex items-center justify-center relative">
            <img 
              src={lightboxPhoto} 
              alt="Visualização expandida" 
              className="max-w-full max-h-[85vh] rounded-lg object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AlbumLoader({ shortId }) {
  const [album, setAlbum] = useState(null);
  const [status, setStatus] = useState('fetching');
  const [actualProgress, setActualProgress] = useState(0);
  const [visualProgress, setVisualProgress] = useState(0);
  const [flyingCards, setFlyingCards] = useState([]);
  const [allPhotosList, setAllPhotosList] = useState([]);

  function vibrar() {
    if ('vibrate' in navigator) {
        navigator.vibrate(200);
    }
  }

  const preloadImages = (photos, profileImage) => {
    const priorityUrls = [];
    if (profileImage) priorityUrls.push(profileImage);
    
    const remainingPhotos = (photos || []).filter(url => url !== profileImage);
    const allUrls = [...priorityUrls, ...remainingPhotos];

    if (allUrls.length === 0) {
      setActualProgress(100);
      return;
    }

    let loaded = 0;
    const total = allUrls.length;

    allUrls.forEach(url => {
      const img = new Image();
      img.src = url;
      
      const handleLoad = () => {
        loaded++;
        setActualProgress(Math.round((loaded / total) * 100));
      };
      
      img.onload = handleLoad;
      img.onerror = handleLoad; 
    });
  };

  useEffect(() => {
    const loadAlbum = async () => {
      try {
        const albumData = await loadAlbumFromSheets(shortId);
        if (albumData) {
          setAlbum(albumData);
          setAllPhotosList(albumData.photos || []);
          setStatus('preloading');
          preloadImages(albumData.photos, albumData.profileImage);
          updateMetaTags(albumData);
        } else {
          setStatus('error');
        }
      } catch (err) {
        setStatus('error');
      }
    };
    loadAlbum();
  }, [shortId]);

  useEffect(() => {
    if (status !== 'preloading') return;

    const interval = setInterval(() => {
      setVisualProgress((prev) => {
        if (actualProgress === 100) {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setStatus('ready'), 400);
            return 100;
          }
          return prev + 1;
        } else {
          if (prev < actualProgress) {
            return prev + 1;
          }
          return prev;
        }
      });
    }, 50);

    return () => clearInterval(interval);
  }, [status, actualProgress]);

  useEffect(() => {
    if (status !== 'preloading' || allPhotosList.length === 0) return;

    let idx = 0;
    const totalPhotos = allPhotosList.length;
    const computedInterval = Math.max(400, Math.floor(3000 / totalPhotos));
    let cardsCreated = 0;

    const spawnInterval = setInterval(() => {
      const targetPhoto = allPhotosList[idx % totalPhotos];
      if (targetPhoto) {
        const cardId = `card-${Date.now()}-${idx}`;
        const cardType = (idx % 8) + 1;
        
        setFlyingCards(prev => [...prev, { id: cardId, url: targetPhoto, type: cardType }]);
        cardsCreated++;
        
        setTimeout(() => {
          vibrar();
          
          const profileEl = document.getElementById('profile-pulse');
          if (profileEl) {
            profileEl.classList.remove('profile-hardware-vibrate');
            void profileEl.offsetWidth;
            profileEl.classList.add('profile-hardware-vibrate');
            
            setTimeout(() => {
              if (profileEl) {
                profileEl.classList.remove('profile-hardware-vibrate');
              }
            }, 200);
          }
          
          setFlyingCards(current => current.filter(c => c.id !== cardId));
        }, 2200);
      }
      idx++;
      
      if (cardsCreated >= totalPhotos) {
        clearInterval(spawnInterval);
      }
    }, computedInterval);

    return () => clearInterval(spawnInterval);
  }, [status, allPhotosList]);

  if (status === 'error') {
    return (
      <div className="h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center">
        <X size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Álbum não encontrado</h2>
        <p className="text-gray-400 text-sm">Verifique o link e tente novamente.</p>
      </div>
    );
  }

  if (status === 'fetching' || status === 'preloading') {
    return (
      <div className="h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-['-apple-system','sans-serif']">
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes flyCenter1 { 0% { transform: translate(-340px, -260px) scale(0.4) rotate(-30deg); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(0, 0) scale(0); opacity: 0; } }
          @keyframes flyCenter2 { 0% { transform: translate(340px, -260px) scale(0.4) rotate(30deg); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(0, 0) scale(0); opacity: 0; } }
          @keyframes flyCenter3 { 0% { transform: translate(-340px, 260px) scale(0.4) rotate(-15deg); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(0, 0) scale(0); opacity: 0; } }
          @keyframes flyCenter4 { 0% { transform: translate(340px, 240px) scale(0.4) rotate(15deg); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(0, 0) scale(0); opacity: 0; } }
          @keyframes flyCenter5 { 0% { transform: translate(0px, -360px) scale(0.4) rotate(10deg); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(0, 0) scale(0); opacity: 0; } }
          @keyframes flyCenter6 { 0% { transform: translate(0px, 360px) scale(0.4) rotate(-10deg); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(0, 0) scale(0); opacity: 0; } }
          @keyframes flyCenter7 { 0% { transform: translate(-420px, 0px) scale(0.4) rotate(25deg); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(0, 0) scale(0); opacity: 0; } }
          @keyframes flyCenter8 { 0% { transform: translate(420px, 0px) scale(0.4) rotate(-25deg); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(0, 0) scale(0); opacity: 0; } }
          @keyframes slide { from { transform: translateX(-100%); } to { transform: translateX(300%); } }
          @keyframes hardwareVibration {
            0% { transform: scale(1); }
            20% { transform: scale(1.12) translate(-2px, 1px); box-shadow: 0 0 45px rgba(212,175,55,0.7); }
            40% { transform: scale(1.02) translate(2px, -1px); }
            60% { transform: scale(1.06) translate(-1px, -1px); box-shadow: 0 0 30px rgba(212,175,55,0.4); }
            80% { transform: scale(1.01) translate(1px, 1px); }
            100% { transform: scale(1); }
          }
          .flying-card-1 { animation: flyCenter1 2.2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards; }
          .flying-card-2 { animation: flyCenter2 2.2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards; }
          .flying-card-3 { animation: flyCenter3 2.2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards; }
          .flying-card-4 { animation: flyCenter4 2.2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards; }
          .flying-card-5 { animation: flyCenter5 2.2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards; }
          .flying-card-6 { animation: flyCenter6 2.2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards; }
          .flying-card-7 { animation: flyCenter7 2.2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards; }
          .flying-card-8 { animation: flyCenter8 2.2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards; }
          .profile-hardware-vibrate { animation: hardwareVibration 0.18s ease-out; }
        `}} />

        <div className="relative z-10 text-center max-w-sm w-full flex flex-col items-center">
          
          <div className="relative w-80 h-80 mb-6 flex items-center justify-center">
            
            {flyingCards.map((card) => {
              const classes = [
                'flying-card-1', 'flying-card-2', 'flying-card-3', 'flying-card-4',
                'flying-card-5', 'flying-card-6', 'flying-card-7', 'flying-card-8'
              ];
              return (
                <div 
                  key={card.id} 
                  className={`absolute inset-0 m-auto w-80 h-80 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 pointer-events-none z-10 ${classes[card.type - 1]}`} 
                >
                  <img src={card.url} alt="Asset" className="absolute top-0 left-0 w-full h-full object-cover bg-neutral-900" />
                </div>
              );
            })}

            <div 
              id="profile-pulse"
              className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#d4af37] shadow-[0_0_30px_rgba(212,175,55,0.4)] bg-neutral-900 z-30 relative"
            >
              {album?.profileImage || album?.photos?.[0] ? (
                <img src={album.profileImage || album.photos[0]} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-neutral-800 animate-pulse flex items-center justify-center">
                  <Camera size={24} className="text-neutral-600" />
                </div>
              )}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1 drop-shadow">
            {album?.clientName || 'Conectando...'}
          </h2>
          <p className="text-gray-400 text-sm mb-8 font-medium">
            {album?.subtitle || 'Preparando experiência visual...'}
          </p>
          
          <span className="text-xs text-[#d4af37] tracking-widest uppercase font-bold mb-3 block animate-pulse">
            Criando seu Álbum {status === 'preloading' ? `${visualProgress}%` : ''}
          </span>
          
          <div className="w-48 bg-white/10 h-[5px] rounded-full overflow-hidden border border-white/5 shadow-inner relative">
            {status === 'fetching' ? (
               <div className="h-full w-1/3 bg-gradient-to-r from-[#d4af37] to-[#f3e5ab] rounded-full animate-[slide_1.5s_ease-in-out_infinite]" />
            ) : (
               <div className="h-full bg-gradient-to-r from-[#d4af37] to-[#f3e5ab] transition-all duration-300 ease-out rounded-full shadow-[0_0_10px_#d4af37]" style={{ width: `${visualProgress}%` }} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return <ClientApp album={album} />;
}

function AdminDashboard({ albums, setAlbums }) {
  const [copiedId, setCopiedId] = useState(null);
  const [savingToCloud, setSavingToCloud] = useState(false);

  const handleDelete = (id) => {
    if(window.confirm('Excluir este álbum do seu histórico?')) {
      setAlbums(albums.filter(a => a.id !== id));
    }
  };

  const handleCopyLink = (album) => {
    const shortId = album.shortId;
    const url = `${window.location.origin}${window.location.pathname}#/album/${shortId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(album.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveToCloud = async (album) => {
    setSavingToCloud(true);
    const success = await saveAlbumToSheets(album);
    if (success) {
      alert('✅ Álbum publicado no Google Sheets! Link funciona em qualquer dispositivo.');
    } else {
      alert('❌ Erro ao publicar. Verifique a URL da API e as permissões.');
    }
    setSavingToCloud(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-black text-[#d4af37] p-2 rounded-xl">
            <Camera size={22} />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Studio Dashboard</h1>
        </div>
        <button onClick={() => window.location.hash = '#new'} className="bg-black text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-medium flex items-center gap-2 hover:bg-gray-800 transition-all text-sm sm:text-base shadow-sm">
          <Plus size={16} /> <span className="hidden sm:inline">Criar Álbum</span>
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">Os Meus Envios</h2>
          <p className="text-gray-500 text-sm mt-1">Álbuns com fotos salvas no GitHub</p>
        </div>

        {albums.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 sm:p-16 text-center flex flex-col items-center">
            <div className="bg-gray-100 rounded-full p-4 mb-4">
              <ImageIcon size={40} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">Nenhum álbum criado</h3>
            <p className="text-gray-500 text-sm mt-2 mb-6">Crie o seu primeiro álbum enviando fotos do seu computador.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map(album => (
              <div key={album.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-5 flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100">
                    <img src={album.profileImage || 'https://images.unsplash.com/photo-1516205651411-aef33a44f7c2?q=80&w=150&auto=format&fit=crop'} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 truncate">{album.clientName}</h3>
                    <p className="text-sm text-gray-500">{album.subtitle}</p>
                    {album.whatsappNumber && album.whatsappNumber.trim() !== '' && (
                      <p className="text-xs text-green-600 mt-1">📱 WhatsApp configurado</p>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-xl text-sm text-gray-600 mb-4">
                  📸 {album.photos?.length || 0} fotos | 🔑 ID: {album.shortId || 'não definido'}
                </div>
                  
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex gap-2">
                    <button onClick={() => window.location.hash = `#edit_${album.id}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit3 size={18} /></button>
                    <button onClick={() => handleDelete(album.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleSaveToCloud(album)} 
                      disabled={savingToCloud}
                      className="px-3 py-2 rounded-full font-medium transition-all flex items-center gap-1 text-xs bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {savingToCloud ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Publicar
                    </button>
                    <button onClick={() => handleCopyLink(album)} className={`px-3 py-2 rounded-full font-medium transition-all flex items-center gap-1 text-xs ${copiedId === album.id ? 'bg-green-500 text-white' : 'bg-black text-white hover:bg-gray-800'}`}>
                      {copiedId === album.id ? <CheckCircle size={12} /> : <LinkIcon size={12} />}
                      Copiar Link
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AdminEditor({ album, onSave, onCancel }) {
  const isNew = !album;
  const [formData, setFormData] = useState(album || {
    id: 'album_' + Math.random().toString(36).substr(2, 9),
    shortId: generateShortId(),
    clientName: '',
    subtitle: '',
    pin: '',
    profileImage: '',
    googleDriveUrl: '',
    whatsappNumber: '',
    photos: [],
    featuredPhotos: []
  });
  
  const [uploadedPhotos, setUploadedPhotos] = useState(formData.photos || []);
  const [selectedFeatured, setSelectedFeatured] = useState(formData.featuredPhotos || []);
  const [selectedProfile, setSelectedProfile] = useState(formData.profileImage || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const resizeImage = (base64, maxWidth = 1200) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = base64;
    });
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    const newPhotos = [...uploadedPhotos];
    let processed = 0;
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        try {
          let base64 = await fileToBase64(file);
          base64 = await resizeImage(base64, 1200);
          newPhotos.push(base64);
        } catch (error) {
          console.error('Erro ao processar imagem:', error);
        }
      }
      processed++;
      setUploadProgress(Math.round((processed / files.length) * 100));
    }
    
    setUploadedPhotos(newPhotos);
    setIsUploading(false);
    setUploadProgress(0);
    
    event.target.value = '';
  };

  const handleRemovePhoto = (index) => {
    const newPhotos = [...uploadedPhotos];
    newPhotos.splice(index, 1);
    setUploadedPhotos(newPhotos);
    
    if (selectedFeatured.includes(index)) {
      setSelectedFeatured(selectedFeatured.filter(i => i !== index));
    }
    
    if (selectedProfile === uploadedPhotos[index]) {
      setSelectedProfile('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.googleDriveUrl) {
      alert("Por favor, insira o link do Google Drive para download das fotos originais.");
      return;
    }
    
    if (uploadedPhotos.length === 0) {
      alert("Por favor, selecione pelo menos uma foto do seu computador.");
      return;
    }
    
    setIsSaving(true);
    setUploadProgress(0);
    
    try {
      const albumId = formData.shortId;
      const uploadedUrls = [];
      let successCount = 0;
      
      for (let i = 0; i < uploadedPhotos.length; i++) {
        const photo = uploadedPhotos[i];
        
        if (photo.startsWith('https://raw.githubusercontent.com/')) {
          uploadedUrls.push(photo);
          successCount++;
          continue;
        }
        
        const fileName = `photo_${Date.now()}_${i}.jpg`;
        const githubUrl = await uploadImageToGitHub(photo, fileName, albumId);
        
        if (githubUrl) {
          uploadedUrls.push(githubUrl);
          successCount++;
        } else {
          uploadedUrls.push(photo);
        }
        
        setUploadProgress(Math.round(((i + 1) / uploadedPhotos.length) * 100));
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      const updatedFeatured = [];
      for (let oldIndex of selectedFeatured) {
        const oldPhotoUrl = uploadedPhotos[oldIndex];
        const newIndex = uploadedUrls.findIndex(url => url === oldPhotoUrl);
        if (newIndex !== -1) {
          updatedFeatured.push(newIndex);
        }
      }
      
      let finalProfileImage = selectedProfile;
      if (selectedProfile && !selectedProfile.startsWith('https://raw.githubusercontent.com/')) {
        const profileIndex = uploadedUrls.findIndex(url => url === selectedProfile);
        finalProfileImage = profileIndex !== -1 ? uploadedUrls[profileIndex] : uploadedUrls[0];
      } else if (!finalProfileImage && uploadedUrls.length > 0) {
        finalProfileImage = uploadedUrls[0];
      }
      
      const finalData = { 
        ...formData, 
        googleDriveUrl: formData.googleDriveUrl,
        whatsappNumber: formData.whatsappNumber,
        photos: uploadedUrls, 
        featuredPhotos: updatedFeatured, 
        profileImage: finalProfileImage
      };
      
      const existingAlbums = JSON.parse(localStorage.getItem('studio_albums_v3') || '[]');
      if (isNew) {
        localStorage.setItem('studio_albums_v3', JSON.stringify([finalData, ...existingAlbums]));
      } else {
        const updatedAlbums = existingAlbums.map(a => a.id === finalData.id ? finalData : a);
        localStorage.setItem('studio_albums_v3', JSON.stringify(updatedAlbums));
      }
      
      await saveAlbumToSheets(finalData);
      
      onSave(finalData);
      alert(`✅ Álbum salvo com sucesso! ${successCount}/${uploadedPhotos.length} fotos enviadas para o GitHub.`);
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert(`❌ Erro ao salvar: ${error.message}\n\nVerifique:\n1. Token do GitHub está correto\n2. Repositório existe e é público\n3. Token tem permissão 'repo'`);
    } finally {
      setIsSaving(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] py-8 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 sm:px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
            {isNew ? <Plus size={22} /> : <Edit3 size={22} />}
            {isNew ? 'Criar Novo Álbum' : 'Editar Álbum'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do Cliente / Casal</label>
              <input required type="text" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" placeholder="Ex: Casamento João & Maria" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Subtítulo (Data ou Local)</label>
              <input type="text" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" placeholder="Ex: 15 de Outubro, 2026" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">PIN de Acesso (Senha)</label>
            <input type="text" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" placeholder="Ex: 1234 (Deixe vazio para acesso livre)" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Link do Google Drive (para Download)</label>
            <input 
              type="url" 
              value={formData.googleDriveUrl} 
              onChange={e => setFormData({...formData, googleDriveUrl: e.target.value})}
              className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" 
              placeholder="https://drive.google.com/drive/folders/..." 
            />
            <p className="text-xs text-gray-500 mt-1">Link para onde o cliente será redirecionado ao clicar em "Baixar Fotos"</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">📱 WhatsApp do Fotógrafo</label>
            <input 
              type="tel" 
              value={formData.whatsappNumber || ''} 
              onChange={e => setFormData({...formData, whatsappNumber: e.target.value})}
              className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all" 
              placeholder="Ex: (11) 91234-5678 ou 5511912345678" 
            />
            <p className="text-xs text-gray-500 mt-1">Deixe em branco se não quiser botão de WhatsApp</p>
          </div>

          <div className="p-6 border-2 border-dashed border-[#d4af37] rounded-xl bg-yellow-50/20">
            <label className="block text-sm font-semibold text-gray-900 mb-2">📸 Fotos do Álbum</label>
            <p className="text-xs text-gray-500 mb-4">Selecione as fotos do seu computador. Elas serão salvas no GitHub.</p>
            
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <label className="flex-1 cursor-pointer">
                <div className="w-full bg-[#d4af37] text-black font-semibold rounded-xl py-3 px-4 flex items-center justify-center gap-2 hover:bg-[#c4a137] transition-all">
                  <FolderUp size={18} />
                  Selecionar Fotos
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading || isSaving}
                />
              </label>
            </div>

            {(isUploading || isSaving) && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#d4af37] h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {isUploading ? 'Processando...' : `Enviando para GitHub... ${uploadProgress}%`}
                </p>
              </div>
            )}

            {uploadedPhotos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">{uploadedPhotos.length} foto(s) selecionada(s)</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-96 overflow-y-auto p-2">
                  {uploadedPhotos.map((photo, idx) => (
                    <div key={idx} className="relative group">
                      <img src={photo} alt={`Foto ${idx + 1}`} className="w-full aspect-square object-cover rounded-xl border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        disabled={isSaving}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {uploadedPhotos.length > 0 && (
            <>
              <div className="p-5 border border-gray-200 rounded-xl bg-gray-50/50">
                <label className="block text-sm font-semibold text-gray-900 mb-3">📷 Foto de Perfil</label>
                <p className="text-xs text-gray-500 mb-4">Clique em uma foto abaixo para definir como foto de perfil</p>
                
                <div className="flex justify-center mb-5">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#d4af37] shadow-md">
                    {selectedProfile ? (
                      <img src={selectedProfile} alt="Perfil" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Camera size={28} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto">
                  {uploadedPhotos.slice(0, 50).map((photo, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedProfile(photo)}
                      className={`relative cursor-pointer transition-all rounded-xl overflow-hidden ${selectedProfile === photo ? 'ring-4 ring-[#d4af37] scale-95' : 'hover:scale-95'}`}
                    >
                      <img src={photo} alt={`Opção ${idx + 1}`} className="w-full aspect-square object-cover" />
                      {selectedProfile === photo && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <CheckCircle size={24} className="text-[#d4af37]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 border border-gray-200 rounded-xl bg-gray-50/50">
                <label className="block text-sm font-semibold text-gray-900 mb-3">⭐ Fotos em Destaque</label>
                <p className="text-xs text-gray-500 mb-4">Selecione as fotos que aparecerão no fundo da tela de acesso (máximo 5)</p>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto">
                  {uploadedPhotos.slice(0, 50).map((photo, idx) => {
                    const isSelected = selectedFeatured.includes(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedFeatured(selectedFeatured.filter(i => i !== idx));
                          } else {
                            if (selectedFeatured.length < 5) {
                              setSelectedFeatured([...selectedFeatured, idx]);
                            } else {
                              alert("Você pode selecionar no máximo 5 fotos em destaque");
                            }
                          }
                        }}
                        className={`relative cursor-pointer transition-all rounded-xl overflow-hidden ${isSelected ? 'ring-4 ring-[#d4af37] scale-95' : 'hover:scale-95'}`}
                      >
                        <img src={photo} alt={`Destaque ${idx + 1}`} className="w-full aspect-square object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <CheckCircle size={24} className="text-[#d4af37]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  {selectedFeatured.length} foto(s) selecionada(s) para destaque
                </p>
              </div>
            </>
          )}

          <div className="pt-5 flex justify-end gap-3 border-t border-gray-100">
            <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-full font-medium text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-8 py-2.5 rounded-full font-semibold text-white bg-black hover:bg-gray-800 transition-all shadow-sm disabled:opacity-50">
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : (isNew ? 'Criar Álbum' : 'Salvar Alterações')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
