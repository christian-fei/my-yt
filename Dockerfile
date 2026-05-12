FROM node:26-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install
RUN apk add python3 ffmpeg

RUN wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
