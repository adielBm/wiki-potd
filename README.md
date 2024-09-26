it downloads the picture of the day from the wikipedia and sets it as the desktop background daily

## Setup

```bash
npm install
schtasks /Create /TN "WikiPOTDTask" /TR "wscript.exe 'C:\...\invisible.vbs' 'C:\...\run.bat'" /SC DAILY /ST 11:06
```

