import React, { useState, useEffect } from 'react';
import { 
  Camera, Plus, Trash2, Edit3, Link as LinkIcon, Eye, 
  PlayCircle, Grid, Download, ArrowRight, Lock, 
  Pause, Play, Image as ImageIcon, CheckCircle, X, Loader2, RefreshCw,
  BarChart3, Award, Search, Upload, Save
} from 'lucide-react';

// Configuração da API do Google Sheets
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbxUZCQSf2z9U5581WIgOZ3zhOYIry5ux3BRkf1O-YgKoL_GXu3AvgqDxe8jzOmGVcBS/exec'; // Substitua pela sua URL do App da Web se necessário

// Funções para salvar/carregar do Google Sheets
const saveAlbumToSheets = async (album) => {
  try {
    const response = await fetch(SHEETS_API_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // AQUI ESTÁ A CORREÇÃO DO CORS
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

// Gerar ID curto (6 caracteres)
const generateShortId = () => {
  return Math.random().toString(36).substring(2, 8);
};

export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  const [albums, setAlbums] = useState(() => {
    const saved = localStorage.getItem('studio_albums_v2');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('studio_albums_v2', JSON.stringify(albums));
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

  // Carregar álbuns da planilha ao iniciar
  useEffect(() => {
    const loadSheetsAlbums = async () => {
      const sheetsAlbums = await loadAllAlbumsFromSheets();
      const localAlbums = JSON.parse(localStorage.getItem('studio_albums_v2') || '[]');
      
      const mergedAlbums = [...localAlbums];
      for (const [id, info] of Object.entries(sheetsAlbums)) {
        if (!mergedAlbums.find(a => a.shortId === id)) {
          // Buscar o álbum completo
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

// Componente da Visão do Cliente com Melhorias Visuais e de Fluxo
function ClientApp({ album }) {
  const [pinInput, setPinInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(!album.pin);
  const [pinError, setPinError] = useState(false);
  
  // Modificado para iniciar diretamente na animação de stories pós-login
  const [activeTab, setActiveTab] = useState('stories'); 
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
  const [isStoryPlaying, setIsStoryPlaying] = useState(true);
  
  // Estado para controle do Lightbox na Galeria
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // Efeito para rotacionar fotos de fundo na tela de Login (Slideshow)
  const [bgImageIdx, setBgImageIdx] = useState(0);
  const featuredList = album.featuredPhotos?.length > 0 
    ? album.featuredPhotos.map(idx => album.photos[idx]).filter(Boolean)
    : album.photos?.slice(0, 5) || [];

  useEffect(() => {
    if (!isAuthenticated && featuredList.length > 1) {
      const bgInterval = setInterval(() => {
        setBgImageIdx(prev => (prev + 1) % featuredList.length);
      }, 5000);
      return () => clearInterval(bgInterval);
    }
  }, [isAuthenticated, featuredList]);

  // Controle de reprodução automática e redirecionamento ao fim dos Stories
  useEffect(() => {
    let interval;
    if (activeTab === 'stories' && isStoryPlaying && album.photos?.length > 0) {
      interval = setInterval(() => {
        setCurrentStoryIdx((prev) => {
          if (prev < album.photos.length - 1) {
            return prev + 1;
          } else {
            // Fim dos stories: Encaminha automaticamente para a aba galeria
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

  // 1. TELA DE LOGIN COM PIN E SLIDESHOW DINÂMICO DE FUNDO
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center font-['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'] p-4 relative overflow-hidden">
        {/* Slideshow de Fundo */}
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
        
        {/* Card Login com Perfil e Estilo Premium Glassmorphism */}
        <div className="max-w-md w-full bg-black/40 backdrop-blur-xl border border-white/15 rounded-3xl p-8 text-center shadow-2xl relative z-10">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#d4af37] shadow-2xl mx-auto mb-4 flex-shrink-0 bg-neutral-900">
            <img 
              src={album.profileImage || 'https://images.unsplash.com/photo-1516205651411-aef33a44f7c2?q=80&w=150&auto=format&fit=crop'} 
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

  // 2. INTERFACE INTERNA DO ÁLBUM
  return (
    <div className="min-h-screen bg-[#111] text-white font-['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'] pb-12">
      {/* Cabeçalho do Álbum */}
      <div className="relative w-full h-64 sm:h-80 lg:h-96 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center blur-sm opacity-40 scale-105"
          style={{ backgroundImage: `url(${album.profileImage || album.photos[0]})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 flex flex-col sm:flex-row items-end sm:items-center gap-6">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-[#d4af37] shadow-xl flex-shrink-0 bg-neutral-900">
            <img 
              src={album.profileImage || 'https://images.unsplash.com/photo-1516205651411-aef33a44f7c2?q=80&w=150&auto=format&fit=crop'} 
              alt="Capa do Álbum" 
              className="w-full h-full object-cover" 
            />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
              {album.clientName}
            </h1>
            <p className="text-[#d4af37] text-sm sm:text-base uppercase tracking-widest font-medium">
              {album.subtitle || 'Álbum Fotográfico'}
            </p>
          </div>
        </div>
      </div>

      {/* SELETOR DE ABAS */}
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

      {/* RENDERIZAÇÃO CONTEÚDO DAS ABAS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        {activeTab === 'gallery' ? (
          /* ABA GALERIA */
          <>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-semibold text-gray-200">Galeria ({album.photos?.length || 0})</h2>
              <button 
                onClick={handleDownloadRedirect}
                className="flex items-center gap-2 text-sm bg-[#d4af37] hover:bg-[#c4a137] text-black font-semibold px-5 py-2.5 rounded-full transition-all shadow-md active:scale-95"
              >
                <Download size={16} /> Baixar Fotos
              </button>
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
          </>
        ) : (
          /* ABA ANIMAÇÃO STORIES COM SIMULADOR MOBILE */
          <div className="flex justify-center items-center py-2">
            {album.photos && album.photos.length > 0 ? (
              /* Maquete/Simulador de Dispositivo Móvel */
              <div className="relative w-full max-w-[390px] aspect-[9/19] bg-neutral-950 rounded-[45px] overflow-hidden shadow-2xl border-[10px] border-neutral-800 flex flex-col justify-between ring-4 ring-neutral-900">
                
                {/* Linhas de progresso estilo Instagram */}
                <div className="absolute top-5 inset-x-5 flex gap-1 z-30 px-1">
                  {album.photos.map((_, idx) => (
                    <div key={idx} className="h-[3px] flex-1 bg-white/20 rounded-full overflow-hidden">
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

                {/* Controles de Topo */}
                <div className="absolute top-9 inset-x-5 flex justify-between items-center z-30 px-2">
                  <span className="text-xs font-semibold text-white bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {currentStoryIdx + 1} / {album.photos.length}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsStoryPlaying(!isStoryPlaying)} 
                      className="text-white bg-black/40 p-1.5 rounded-full backdrop-blur-sm border border-white/10 hover:bg-black/60 transition-colors"
                    >
                      {isStoryPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button 
                      onClick={() => setActiveTab('gallery')} 
                      className="text-white bg-black/40 p-1.5 rounded-full backdrop-blur-sm border border-white/10 hover:bg-black/60 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Foto do Story */}
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
                  <img 
                    src={album.photos[currentStoryIdx]} 
                    alt={`Story ${currentStoryIdx + 1}`} 
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Toques Laterais para Retroceder / Avançar */}
                <div className="absolute inset-0 z-20 flex">
                  <div 
                    className="w-[30%] h-full cursor-w-resize" 
                    onClick={() => {
                      if (currentStoryIdx > 0) setCurrentStoryIdx(currentStoryIdx - 1);
                    }}
                  />
                  <div 
                    className="w-[70%] h-full cursor-e-resize" 
                    onClick={() => {
                      if (currentStoryIdx < album.photos.length - 1) {
                        setCurrentStoryIdx(currentStoryIdx + 1);
                      } else {
                        setIsStoryPlaying(false);
                        setActiveTab('gallery');
                      }
                    }}
                  />
                </div>

              </div>
            ) : (
              <div className="text-center py-20 text-gray-500">
                <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
                <p>Nenhuma foto disponível para os Stories.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. MODAL DE LIGHTBOX (VISUALIZADOR INDIVIDUAL DE FOTOS) */}
      {lightboxPhoto && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <button 
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-6 right-6 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all border border-white/10"
          >
            <X size={24} />
          </button>
          <div className="max-w-5xl max-h-[85vh] flex items-center justify-center">
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

// Componente AlbumLoader Ajustado com Animação Premium "Criando seu Álbum"
function AlbumLoader({ shortId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [album, setAlbum] = useState(null);
  const [assembling, setAssembling] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const loadAlbum = async () => {
      try {
        const albumData = await loadAlbumFromSheets(shortId);
        if (albumData) {
          setAlbum(albumData);
          setAssembling(true);
        } else {
          const localAlbums = JSON.parse(localStorage.getItem('studio_albums_v2') || '[]');
          const localAlbum = localAlbums.find(a => a.shortId === shortId);
          if (localAlbum) {
            setAlbum(localAlbum);
            setAssembling(true);
          } else {
            setError(true);
            setLoading(false);
          }
        }
      } catch (err) {
        setError(true);
        setLoading(false);
      }
    };
    loadAlbum();
  }, [shortId]);

  // Simulação de Progresso da Animação Cinematográfica (2.5 Segundos)
  useEffect(() => {
    if (assembling) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setLoading(false);
            setAssembling(false);
            return 100;
          }
          return prev + 4;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [assembling]);

  // ANIMAÇÃO EM ESTÁGIO DE BUSCA INICIAL (PLANILHA/BANCO)
  if (loading && !assembling) {
    return (
      <div className="h-screen bg-black text-white flex flex-col items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[#d4af37] mb-3" />
        <p className="text-gray-400 text-sm tracking-widest uppercase">Localizando Álbum...</p>
      </div>
    );
  }

  // ANIMAÇÃO EXCLUSIVA SOLICITADA: FOTOS SURGINDO E ENTRANDO NO PERFIL
  if (assembling && album) {
    return (
      <div className="h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-['-apple-system','sans-serif']">
        
        {/* Estilos CSS Injetados para Efeitos Dinâmicos de Entrada de Fotos */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes flyCenter1 { 0% { transform: translate(-300px, -200px) scale(0.2) rotate(-30deg); opacity: 0; } 100% { transform: translate(0, 0) scale(1) rotate(0); opacity: 0.8; } }
          @keyframes flyCenter2 { 0% { transform: translate(320px, -150px) scale(0.2) rotate(40deg); opacity: 0; } 100% { transform: translate(0, 0) scale(1) rotate(0); opacity: 0.8; } }
          @keyframes flyCenter3 { 0% { transform: translate(-250px, 250px) scale(0.2) rotate(-15deg); opacity: 0; } 100% { transform: translate(0, 0) scale(1) rotate(0); opacity: 0.8; } }
          @keyframes flyCenter4 { 0% { transform: translate(280px, 280px) scale(0.2) rotate(25deg); opacity: 0; } 100% { transform: translate(0, 0) scale(1) rotate(0); opacity: 0.8; } }
          .flying-card-1 { animation: flyCenter1 2.2s infinite ease-in-out; }
          .flying-card-2 { animation: flyCenter2 2s infinite ease-in-out; delay: 0.3s; }
          .flying-card-3 { animation: flyCenter3 2.4s infinite ease-in-out; delay: 0.1s; }
          .flying-card-4 { animation: flyCenter4 2.1s infinite ease-in-out; delay: 0.5s; }
        `}} />

        {/* Fotos Flutuantes que convergem para o centro */}
        {album.photos?.slice(0, 4).map((img, i) => {
          const classes = ['flying-card-1', 'flying-card-2', 'flying-card-3', 'flying-card-4'];
          return (
            <div 
              key={i} 
              className={`absolute w-20 h-20 rounded-xl overflow-hidden shadow-2xl border border-white/20 pointer-events-none z-0 ${classes[i]}`}
              style={{ top: 'calc(50% - 40px)', left: 'calc(50% - 40px)' }}
            >
              <img src={img} alt="flying asset" className="w-full h-full object-cover blur-[0.5px]" />
            </div>
          );
        })}

        {/* Bloco Central do Perfil */}
        <div className="relative z-10 text-center max-w-sm w-full flex flex-col items-center">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#d4af37] shadow-[0_0_30px_rgba(212,175,55,0.2)] mb-6 bg-neutral-900 transition-transform duration-500 hover:scale-105">
            <img 
              src={album.profileImage || album.photos[0]} 
              alt="Perfil" 
              className="w-full h-full object-cover"
            />
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1 drop-shadow">{album.clientName}</h2>
          <p className="text-gray-400 text-sm mb-8 font-medium">{album.subtitle || 'Fotografia'}</p>
          
          {/* Mensagem e Barra de Progresso Real */}
          <span className="text-xs text-[#d4af37] tracking-widest uppercase font-bold mb-3 block animate-pulse">
            Criando seu Álbum
          </span>
          
          <div className="w-48 bg-white/10 h-[5px] rounded-full overflow-hidden border border-white/5 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-[#d4af37] to-[#f3e5ab] transition-all duration-100 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center font-['-apple-system','sans-serif']">
        <X size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Álbum não encontrado</h2>
        <p className="text-gray-400 text-sm">Verifique o link e tente novamente.</p>
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
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900 font-['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-black text-[#d4af37] p-2 rounded-xl">
            <Camera size={22} className="sm:w-6 sm:h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Studio Dashboard</h1>
        </div>
        <button onClick={() => window.location.hash = '#new'} className="bg-black text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-medium flex items-center gap-2 hover:bg-gray-800 transition-all text-sm sm:text-base shadow-sm">
          <Plus size={16} className="sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Criar Álbum</span>
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">Os Meus Envios</h2>
          <p className="text-gray-500 text-sm mt-1">Álbuns configurados para extração do Google Drive</p>
        </div>

        {albums.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 sm:p-16 text-center flex flex-col items-center">
            <div className="bg-gray-100 rounded-full p-4 mb-4">
              <ImageIcon size={40} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">Nenhum álbum criado</h3>
            <p className="text-gray-500 text-sm mt-2 mb-6">Crie o seu primeiro álbum informando o link de uma pasta do Google Drive.</p>
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
    photos: [],
    featuredPhotos: []
  });
  
  const [extractedPhotos, setExtractedPhotos] = useState(formData.photos || []);
  const [selectedFeatured, setSelectedFeatured] = useState(formData.featuredPhotos || []);
  const [selectedProfile, setSelectedProfile] = useState(formData.profileImage || '');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState('');
  const [extractedUrl, setExtractedUrl] = useState(formData.googleDriveUrl || '');
  const [extractionProgress, setExtractionProgress] = useState(0);

  const extractPhotosFromDrive = async (updateOnly = false) => {
    if (!extractedUrl || !extractedUrl.includes('drive.google.com')) {
      alert("Por favor, insira um link válido de uma pasta do Google Drive");
      return;
    }

    setIsExtracting(true);
    setExtractionError(false);
    setExtractionMessage(updateOnly ? 'A atualizar novas fotos...' : 'A extrair fotos do Google Drive...');
    setExtractionProgress(0);

    const progressInterval = setInterval(() => {
      setExtractionProgress(prev => prev >= 90 ? 90 : prev + 15);
    }, 200);
    
    try {
      const apiUrl = `https://api-extrator-albuns.vercel.app/api/extract?url=${encodeURIComponent(extractedUrl)}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.success && data.photos && data.photos.length > 0) {
        setExtractionProgress(100);
        const validPhotos = data.photos.filter(photo => photo && photo.startsWith('http'));
        
        let newPhotos = validPhotos;
        let addedCount = validPhotos.length;
        
        if (updateOnly) {
          const existingUrls = new Set(extractedPhotos);
          newPhotos = [...extractedPhotos];
          let count = 0;
          
          for (const photo of validPhotos) {
            if (!existingUrls.has(photo)) {
              newPhotos.push(photo);
              count++;
            }
          }
          addedCount = count;
          setExtractedPhotos(newPhotos);
          setExtractionMessage(`${addedCount} nova(s) foto(s) adicionada(s)! Total: ${newPhotos.length} fotos`);
        } else {
          setExtractedPhotos(validPhotos);
          setExtractionMessage(`${validPhotos.length} fotos extraídas com sucesso!`);
        }
        
        setSelectedFeatured([]);
        setSelectedProfile('');
        setFormData(prev => ({ ...prev, photos: newPhotos }));
        setTimeout(() => setExtractionMessage(''), 3000);
      } else {
        setExtractionError(true);
        setExtractionMessage(data.error || 'Não foi possível extrair as fotos. Verifique se a pasta é pública.');
        if (!updateOnly) setExtractedPhotos([]);
      }
    } catch (error) {
      console.error("Erro ao extrair:", error);
      setExtractionError(true);
      setExtractionMessage('Erro ao conectar com a API. Tente novamente.');
      if (!updateOnly) setExtractedPhotos([]);
    } finally {
      setTimeout(() => {
        setIsExtracting(false);
        clearInterval(progressInterval);
      }, 500);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!extractedUrl) {
      alert("Por favor, insira o link do Google Drive.");
      return;
    }
    if (extractedPhotos.length === 0) {
      alert("Por favor, extraia as fotos do Google Drive primeiro.");
      return;
    }
    const finalData = { ...formData, googleDriveUrl: extractedUrl, photos: extractedPhotos, featuredPhotos: selectedFeatured, profileImage: selectedProfile };
    onSave(finalData);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] py-8 sm:py-12 px-4 font-['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']">
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

          <div className="p-6 border-2 border-dashed border-[#d4af37] rounded-xl bg-yellow-50/20">
            <label className="block text-sm font-semibold text-gray-900 mb-2">Link da Pasta no Google Drive</label>
            <p className="text-xs text-gray-500 mb-4">Cole o link partilhado da pasta e clique em "Extrair Fotos". A pasta deve estar pública.</p>
            
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input 
                type="url" 
                value={extractedUrl} 
                onChange={e => setExtractedUrl(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-[#d4af37] focus:border-transparent outline-none transition-all font-mono text-sm" 
                placeholder="Ex: https://drive.google.com/drive/folders/..." 
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => extractPhotosFromDrive(false)}
                  disabled={isExtracting}
                  className="px-6 py-3 bg-[#d4af37] text-black font-semibold rounded-xl hover:bg-[#c4a137] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {isExtracting ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                  {isExtracting ? 'Extraindo...' : 'Extrair Fotos'}
                </button>
                {!isNew && (
                  <button
                    type="button"
                    onClick={() => extractPhotosFromDrive(true)}
                    disabled={isExtracting}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                  >
                    {isExtracting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                    {isExtracting ? 'Atualizando...' : 'Atualizar Novas'}
                  </button>
                )}
              </div>
            </div>

            {isExtracting && (
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4 overflow-hidden">
                <div className="bg-[#d4af37] h-1.5 rounded-full transition-all duration-300" style={{ width: `${extractionProgress}%` }}></div>
              </div>
            )}

            {extractionMessage && (
              <div className={`text-sm mt-2 p-3 rounded-xl ${extractionError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {extractionError ? <X size={16} className="inline mr-2" /> : <CheckCircle size={16} className="inline mr-2" />}
                {extractionMessage}
              </div>
            )}
          </div>

          {extractedPhotos.length > 0 && (
            <>
              <div className="p-5 border border-gray-200 rounded-xl bg-gray-50/50">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Fotos Extraídas ({extractedPhotos.length})
                </label>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto">
                  {extractedPhotos.map((photo, idx) => (
                    <div key={idx} className="relative group">
                      <img src={photo} alt={`Foto ${idx + 1}`} className="w-full aspect-square object-cover rounded-xl border border-gray-200" />
                    </div>
                  ))}
                </div>
              </div>

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
                  {extractedPhotos.slice(0, 30).map((photo, idx) => (
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
                  {extractedPhotos.slice(0, 30).map((photo, idx) => {
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
            <button type="submit" className="px-8 py-2.5 rounded-full font-semibold text-white bg-black hover:bg-gray-800 transition-all shadow-sm">
              {isNew ? 'Criar Álbum' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
