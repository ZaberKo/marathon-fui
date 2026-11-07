import subprocess, sys
import numpy as np
f = sys.argv[1]; sr = 22050
raw = subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar',str(sr),'-f','s16le','-'],capture_output=True).stdout
x = np.frombuffer(raw,dtype=np.int16).astype(np.float32)/32768
hop = 256; win = 1024
fr = np.lib.stride_tricks.sliding_window_view(x, win)[::hop]
S = np.abs(np.fft.rfft(fr*np.hanning(win),axis=1))
flux = np.concatenate([[0],np.maximum(0,np.diff(np.log1p(S),axis=0)).sum(1)])
rms = 20*np.log10(np.sqrt((fr**2).mean(1))+1e-9)
t = np.arange(len(flux))*hop/sr
for a,b in [(2,7),(27,31),(35,39),(46,51.5),(66,74),(74,82),(98,110),(124,133),(131,136)]:
    m=(t>=a)&(t<b)
    idx=np.where(m)[0]
    top=idx[np.argsort(flux[idx])[-3:]][::-1]
    print(f'[{a:5.1f},{b:5.1f}] strongest onsets: ' + ', '.join(f'{t[i]:.2f}s(f{flux[i]:.0f},{rms[i]:.0f}dB)' for i in top))
# exact silence spans below -50 dB
sil=[];st=None
for i,v in enumerate(rms):
    if v<-50 and st is None: st=i
    if v>=-50 and st is not None:
        if (i-st)*hop/sr>0.15: sil.append((t[st],t[i]))
        st=None
if st is not None: sil.append((t[st],t[-1]))
print('silences <-50dB:', ', '.join(f'{a:.2f}-{b:.2f}' for a,b in sil))
