// EXIF解析処理
class ExifParser {
    constructor() {
        this.rawData = null;
        this.parsedData = {
            basic: {},
            camera: {},
            settings: {},
            gps: {},
            other: {}
        };
    }

    // 画像からEXIF情報を抽出
    parseImage(file, imageElement) {
        return new Promise((resolve, reject) => {
            EXIF.getData(imageElement, () => {
                try {
                    this.rawData = EXIF.getAllTags(imageElement);
                    
                    // ファイル基本情報を追加
                    this.parsedData.basic = this.extractBasicInfo(file, imageElement);
                    this.parsedData.camera = this.extractCameraInfo();
                    this.parsedData.settings = this.extractSettingsInfo();
                    this.parsedData.gps = this.extractGpsInfo();
                    this.parsedData.other = this.extractOtherInfo();

                    resolve(this.parsedData);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    // 基本情報を抽出
    extractBasicInfo(file, imageElement) {
        const dateTime = this.rawData.DateTime || this.rawData.DateTimeOriginal || this.rawData.DateTimeDigitized;
        
        return {
            'ファイル名': file.name,
            'ファイルサイズ': this.formatFileSize(file.size),
            'ファイル形式': file.type,
            '画像サイズ': `${imageElement.naturalWidth} x ${imageElement.naturalHeight} px`,
            '撮影日時': dateTime || null,
            '更新日時': this.rawData.DateTime || null,
            'オリジナル撮影日時': this.rawData.DateTimeOriginal || null
        };
    }

    // カメラ情報を抽出
    extractCameraInfo() {
        return {
            'メーカー': this.rawData.Make || null,
            'モデル': this.rawData.Model || null,
            'レンズメーカー': this.rawData.LensMake || null,
            'レンズモデル': this.rawData.LensModel || null,
            'レンズ仕様': this.rawData.LensSpecification ? this.formatLensSpec(this.rawData.LensSpecification) : null,
            'シリアル番号': this.rawData.SerialNumber || this.rawData.InternalSerialNumber || null
        };
    }

    // 撮影設定を抽出
    extractSettingsInfo() {
        return {
            'ISO感度': this.rawData.ISOSpeedRatings || this.rawData.PhotographicSensitivity || null,
            'シャッタースピード': this.rawData.ExposureTime ? this.formatExposureTime(this.rawData.ExposureTime) : null,
            '絞り値': this.rawData.FNumber ? `F${this.rawData.FNumber}` : null,
            '焦点距離': this.rawData.FocalLength ? `${this.rawData.FocalLength}mm` : null,
            '35mm換算焦点距離': this.rawData.FocalLengthIn35mmFilm ? `${this.rawData.FocalLengthIn35mmFilm}mm` : null,
            '露出補正': this.rawData.ExposureBiasValue ? `${this.rawData.ExposureBiasValue} EV` : null,
            '測光モード': this.getMeteringMode(this.rawData.MeteringMode),
            '露出プログラム': this.getExposureProgram(this.rawData.ExposureProgram),
            'ホワイトバランス': this.getWhiteBalance(this.rawData.WhiteBalance),
            'フラッシュ': this.getFlashInfo(this.rawData.Flash),
            'フラッシュモード': this.rawData.FlashMode !== undefined ? this.rawData.FlashMode : null,
            '色空間': this.getColorSpace(this.rawData.ColorSpace),
            'デジタルズーム比': this.rawData.DigitalZoomRatio || null
        };
    }

    // GPS情報を抽出
    extractGpsInfo() {
        const lat = this.rawData.GPSLatitude;
        const lon = this.rawData.GPSLongitude;
        const latRef = this.rawData.GPSLatitudeRef;
        const lonRef = this.rawData.GPSLongitudeRef;

        let latitude = null;
        let longitude = null;

        if (lat && lon && latRef && lonRef) {
            latitude = this.convertDMSToDD(lat, latRef);
            longitude = this.convertDMSToDD(lon, lonRef);
        }

        return {
            '緯度': latitude,
            '経度': longitude,
            '高度': this.rawData.GPSAltitude ? `${this.rawData.GPSAltitude}m` : null,
            '高度基準': this.rawData.GPSAltitudeRef === 0 ? '海抜' : this.rawData.GPSAltitudeRef === 1 ? '海面下' : null,
            '撮影方向': this.rawData.GPSImgDirection ? `${this.rawData.GPSImgDirection}°` : null,
            'GPS日時': this.rawData.GPSDateStamp || null,
            'マップリンク': (latitude && longitude) ? `https://www.google.com/maps?q=${latitude},${longitude}` : null
        };
    }

    // その他の情報を抽出
    extractOtherInfo() {
        const knownTags = new Set([
            'DateTime', 'DateTimeOriginal', 'DateTimeDigitized',
            'Make', 'Model', 'LensMake', 'LensModel', 'LensSpecification', 'SerialNumber', 'InternalSerialNumber',
            'ISOSpeedRatings', 'PhotographicSensitivity', 'ExposureTime', 'FNumber', 'FocalLength',
            'FocalLengthIn35mmFilm', 'ExposureBiasValue', 'MeteringMode', 'ExposureProgram',
            'WhiteBalance', 'Flash', 'FlashMode', 'ColorSpace', 'DigitalZoomRatio',
            'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef',
            'GPSAltitude', 'GPSAltitudeRef', 'GPSImgDirection', 'GPSDateStamp',
            'thumbnail', 'Thumbnail'
        ]);

        const other = {};
        for (const [key, value] of Object.entries(this.rawData)) {
            if (!knownTags.has(key) && typeof value !== 'object') {
                other[key] = value;
            }
        }

        return other;
    }

    // DMSからDD（度分秒から十進度）に変換
    convertDMSToDD(dms, ref) {
        if (!Array.isArray(dms) || dms.length !== 3) return null;
        
        const degrees = dms[0];
        const minutes = dms[1];
        const seconds = dms[2];
        
        let dd = degrees + minutes / 60 + seconds / 3600;
        
        if (ref === 'S' || ref === 'W') {
            dd = dd * -1;
        }
        
        return dd.toFixed(6);
    }

    // ファイルサイズをフォーマット
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    // 露出時間をフォーマット
    formatExposureTime(time) {
        if (time >= 1) return `${time}s`;
        const denominator = Math.round(1 / time);
        return `1/${denominator}s`;
    }

    // レンズ仕様をフォーマット
    formatLensSpec(spec) {
        if (!Array.isArray(spec)) return spec;
        return spec.join(', ');
    }

    // 測光モードを取得
    getMeteringMode(mode) {
        const modes = {
            0: '不明',
            1: '平均測光',
            2: '中央重点測光',
            3: 'スポット測光',
            4: 'マルチスポット測光',
            5: 'パターン測光',
            6: '部分測光',
            255: 'その他'
        };
        return mode !== undefined ? modes[mode] || mode : null;
    }

    // 露出プログラムを取得
    getExposureProgram(program) {
        const programs = {
            0: '未定義',
            1: 'マニュアル',
            2: 'プログラムAE',
            3: '絞り優先AE',
            4: 'シャッター優先AE',
            5: 'クリエイティブプログラム',
            6: 'アクションプログラム',
            7: 'ポートレートモード',
            8: '風景モード'
        };
        return program !== undefined ? programs[program] || program : null;
    }

    // ホワイトバランスを取得
    getWhiteBalance(wb) {
        const wbModes = {
            0: 'オート',
            1: 'マニュアル'
        };
        return wb !== undefined ? wbModes[wb] || wb : null;
    }

    // フラッシュ情報を取得
    getFlashInfo(flash) {
        if (flash === undefined) return null;
        
        const fired = flash & 0x01 ? '発光' : '非発光';
        return fired;
    }

    // 色空間を取得
    getColorSpace(space) {
        const spaces = {
            1: 'sRGB',
            2: 'Adobe RGB',
            65535: '未定義'
        };
        return space !== undefined ? spaces[space] || space : null;
    }

    // 生データを取得
    getRawData() {
        return this.rawData;
    }
}
