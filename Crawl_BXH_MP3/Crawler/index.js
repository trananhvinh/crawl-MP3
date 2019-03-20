const Crawler = require('crawler');
const fs = require('fs');
const PromiseSerial = require('./PromiseSerial');

const baseLink = 'https://mp3.zing.vn';

let crawlTask = [];

let writeStream = fs.createWriteStream('crawlResult.csv', {
    flag: 'a',
});

function formatString(str) {
    while (str.indexOf('  ') != -1) {
        str = str.replace('  ', ' ');
    }

    while (str[0] == ' ') {
        str = str.slice(1, str.length);
    }

    str = str.toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y");
    str = str.replace(/đ/g,"d");
    str = str.replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'|\"|\&|\#|\[|\]|~|\$|_|`|-|{|}|\||\\/g," ");
    str = str.replace(/ + /g," ");
    str = str.trim();

    return str;
}

let crawAllSongOnWeek = _week => {
    return new Promise((resolve, reject) => {
        let week = _week;
        let link = `https://mp3.zing.vn/zing-chart-tuan/Bai-hat-Viet-Nam/IWZ9Z08I.html?w=${week}&y=2018`;
        console.log(link);

        const crawler = new Crawler({
            rateLimit: 2000,
            callback: (err, res, done) => {
                let $ = res.$;

                let songs = $('.tracking-page-session')
                    .first()
                    .find('li')
                    .find('div')
                    .find('.e-item')
                    .find('h3')
                    .find('a');

                songs.each((index, song) => {
                    let songLink = $(song).attr('href');
                    let url = baseLink + songLink;
                    let rank = index + 1;
                    crawlTask.push(() => crawSongInfoOnLink(url, week, rank));
                    crawlTask.push(() => {
                        return new Promise((resolve, reject) => {
                            setInterval(() => {
                                resolve();
                            }, 1000);
                        })
                    })
                });
                resolve();
            },
        });

        crawler.queue(link);
    });
};

let crawSongInfoOnLink = (link, _week, _rank) => {
    return new Promise((resolve, reject) => {
        const week = _week;
        const rank = _rank;
        const crawler = new Crawler({
            rateLimit: 2000,
            callback: (err, res, done) => {
                let $ = res.$;

                let texts = $('.txt-primary')
                    .first()
                    .text()
                    .replace(/\n/g, '')
                    .split('-');

                let title = formatString(texts[0]);
                let singer = formatString(texts[1]);
                let author = formatString($('#composer-container').find('h2')
                    .text());
                let album = formatString($(
                    'body > div.wrapper-page > div.wrap-body.group.page-play-song.container.playing-song > div.info-top-play.group.mb7 > div.info-song-top.otr.fl > div:nth-child(6) > h2 > a',
                ).text());
                let hasMV =
                    $(
                        'body > div.wrapper-page > div.wrap-body.group.page-play-song.container.playing-song > div.wrap-content > div.section.mt0 > div.section.section.mt20 > div.media-func.group.fn-tabgroup > a',
                    ).length >= 5;

                // Ghi ra file
                let songDefailtInfo = [week, rank, title, singer, author, album, hasMV];
                writeStream.write(songDefailtInfo.join(';') + '\n');
                console.log(`[${week}] [${rank}] ${title}`);
                resolve();
            },
        });

        crawler.queue(link);
    });
};

let queue = [];
let from = 35;
let to = 46;
for (i = from; i <= to; i++) {
    let week = i;
    queue.push(() => crawAllSongOnWeek(week));
}

PromiseSerial(queue).then(() => {
    PromiseSerial(crawlTask).then(() => {
        console.log('Done');
    })
})

