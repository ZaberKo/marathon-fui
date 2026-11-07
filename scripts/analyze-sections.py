import subprocess, sys
import numpy as np
f = sys.argv[1]; sr = 22050
raw = subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar',str(sr),'-f','s16le','-'],capture_output=True).stdout
x = np.frombuffer(raw,dtype=np.int16).astype(np.float32)/32768
hop = 512; win = 2048
fr = np.lib.stride_tricks.sliding_window_view(x, win)[::hop]
S = np.abs(np.fft.rfft(fr*np.hanning(win),axis=1))
freqs = np.fft.rfftfreq(win,1/sr)
rms = np.sqrt((fr**2).mean(1))
cent = (S*freqs).sum(1)/(S.sum(1)+1e-9)
low = S[:, freqs<150].sum(1)/(S.sum(1)+1e-9)
flux = np.concatenate([[0],np.maximum(0,np.diff(np.log1p(S),axis=0)).sum(1)])
t = np.arange(len(rms))*hop/sr
thr = np.percentile(flux, 96)
on = (flux>thr)&(np.r_[0,flux[:-1]]<flux)&(np.r_[flux[1:],0]<=flux)
print(' sec | dB   | cent kHz | low% | onsets')
for s in range(0,int(t[-1])+1,2):
    m=(t>=s)&(t<s+2)
    if not m.any(): continue
    db=20*np.log10(rms[m].mean()+1e-9)
    bar='#'*max(0,int((db+50)/2))
    print(f'{s:4d} | {db:5.1f} | {cent[m].mean()/1000:5.2f}    | {low[m].mean()*100:4.0f} | {on[m].sum():2d}  {bar}')
