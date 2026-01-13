// メインアプリケーションロジック
class ExifViewerApp {
    constructor() {
        this.parser = new ExifParser();
        this.ui = new UIController();
        this.currentFile = null;
        this.currentImageUrl = null;
        
        this.initEventListeners();
    }

    // イベントリスナーを初期化
    initEventListeners() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const searchBox = document.getElementById('search-box');
        const showRawToggle = document.getElementById('show-raw-toggle');
        const tabButtons = document.querySelectorAll('.tab-button');

        // ドロップゾーンのクリック
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        // ファイル選択
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0]);
            }
        });

        // ドラッグ&ドロップ
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                this.handleFile(e.dataTransfer.files[0]);
            }
        });

        // 検索
        searchBox.addEventListener('input', (e) => {
            this.ui.applySearchFilter(e.target.value);
        });

        // 生データ表示切り替え
        showRawToggle.addEventListener('change', (e) => {
            this.ui.toggleRawData(e.target.checked);
        });

        // タブ切り替え
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                this.ui.switchTab(tabName);
            });
        });
    }

    // ファイルを処理
    async handleFile(file) {
        // ファイル形式チェック
        const validTypes = ['image/jpeg', 'image/png', 'image/tiff'];
        const validExtensions = ['.jpg', '.jpeg', '.png', '.tif', '.tiff'];
        
        const fileName = file.name.toLowerCase();
        const fileType = file.type.toLowerCase();
        
        const hasValidType = validTypes.includes(fileType);
        const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
        
        if (!hasValidType && !hasValidExtension) {
            this.ui.showError('対応していないファイル形式です。JPEG、PNG、TIFF形式の画像を選択してください。');
            return;
        }

        // ファイルサイズチェック（10MB）
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            this.ui.showError('ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。');
            return;
        }

        this.currentFile = file;

        try {
            // 画像を読み込み
            const imageUrl = await this.readFileAsDataURL(file);
            this.currentImageUrl = imageUrl;

            // 画像要素を作成
            const img = new Image();
            img.onload = async () => {
                try {
                    // プレビューを表示
                    this.ui.showPreview(file, imageUrl);
                    this.ui.showContent();

                    // EXIF情報を解析
                    const exifData = await this.parser.parseImage(file, img);
                    
                    // EXIF情報が空かチェック
                    const hasExifData = this.checkHasExifData(exifData);
                    
                    if (!hasExifData) {
                        this.ui.showNoExifMessage(file.type);
                    } else {
                        this.ui.displayExifData(exifData);
                    }

                } catch (error) {
                    console.error('EXIF解析エラー:', error);
                    this.ui.showError('EXIF情報の解析中にエラーが発生しました。');
                }
            };

            img.onerror = () => {
                this.ui.showError('画像の読み込みに失敗しました。');
            };

            img.src = imageUrl;

        } catch (error) {
            console.error('ファイル読み込みエラー:', error);
            this.ui.showError('ファイルの読み込みに失敗しました。');
        }
    }

    // ファイルをDataURLとして読み込み
    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            
            reader.onerror = () => {
                reject(new Error('ファイルの読み込みに失敗しました'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    // EXIF情報が存在するかチェック
    checkHasExifData(data) {
        // 基本情報以外のカテゴリにデータがあるかチェック
        const hasCamera = Object.values(data.camera).some(v => v !== null && v !== undefined);
        const hasSettings = Object.values(data.settings).some(v => v !== null && v !== undefined);
        const hasGps = Object.values(data.gps).some(v => v !== null && v !== undefined);
        const hasOther = Object.keys(data.other).length > 0;

        return hasCamera || hasSettings || hasGps || hasOther;
    }
}

// アプリケーション起動
document.addEventListener('DOMContentLoaded', () => {
    const app = new ExifViewerApp();
});
