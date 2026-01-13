// UI操作関連
class UIController {
    constructor() {
        this.currentFilter = '';
        this.allData = null;
    }

    // エラーメッセージを表示
    showError(message) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 5000);
    }

    // コンテンツエリアを表示
    showContent() {
        document.getElementById('content-area').classList.remove('hidden');
    }

    // プレビュー画像を表示
    showPreview(file, imageUrl) {
        const previewImg = document.getElementById('preview-image');
        const fileInfo = document.getElementById('file-info');
        
        previewImg.src = imageUrl;
        
        const lastModified = new Date(file.lastModified).toLocaleString('ja-JP');
        fileInfo.innerHTML = `
            <div><strong>ファイル名:</strong> ${file.name}</div>
            <div><strong>サイズ:</strong> ${this.formatFileSize(file.size)}</div>
            <div><strong>更新日:</strong> ${lastModified}</div>
        `;
    }

    // EXIF情報を表示
    displayExifData(data) {
        this.allData = data;
        
        this.populateTable('basic-table', data.basic);
        this.populateTable('camera-table', data.camera);
        this.populateTable('settings-table', data.settings);
        this.populateTable('gps-table', data.gps);
        this.populateTable('other-table', data.other);
        
        // 生データを表示
        const rawDataPre = document.getElementById('raw-data');
        rawDataPre.textContent = JSON.stringify(data, null, 2);
    }

    // テーブルにデータを挿入
    populateTable(tableId, data) {
        const table = document.getElementById(tableId);
        table.innerHTML = '';

        if (Object.keys(data).length === 0) {
            const row = table.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 2;
            cell.textContent = 'データがありません';
            cell.className = 'no-data';
            cell.style.textAlign = 'center';
            return;
        }

        for (const [key, value] of Object.entries(data)) {
            const row = table.insertRow();
            const keyCell = row.insertCell();
            const valueCell = row.insertCell();

            keyCell.textContent = key;
            
            if (value === null || value === undefined || value === '') {
                valueCell.textContent = 'データなし';
                valueCell.className = 'no-data';
            } else if (key === 'マップリンク') {
                const link = document.createElement('a');
                link.href = value;
                link.target = '_blank';
                link.textContent = 'Google Mapsで開く';
                link.className = 'clickable';
                valueCell.appendChild(link);
            } else {
                valueCell.textContent = value;
            }

            // 検索フィルタリング用のデータ属性を追加
            row.setAttribute('data-key', key.toLowerCase());
            row.setAttribute('data-value', String(value).toLowerCase());
        }
    }

    // 検索フィルタを適用
    applySearchFilter(query) {
        this.currentFilter = query.toLowerCase();
        
        const tables = document.querySelectorAll('.exif-table');
        tables.forEach(table => {
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
                const key = row.getAttribute('data-key') || '';
                const value = row.getAttribute('data-value') || '';
                
                if (key.includes(this.currentFilter) || value.includes(this.currentFilter)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // タブを切り替え
    switchTab(tabName) {
        // タブボタンのアクティブ状態を更新
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // タブコンテンツの表示を更新
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.querySelector(`.tab-pane[data-tab="${tabName}"]`).classList.add('active');
    }

    // 生データ表示を切り替え
    toggleRawData(show) {
        const rawDataArea = document.getElementById('raw-data-area');
        if (show) {
            rawDataArea.classList.remove('hidden');
        } else {
            rawDataArea.classList.add('hidden');
        }
    }

    // ファイルサイズをフォーマット
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    // EXIF情報が見つからない場合の処理
    showNoExifMessage(fileType) {
        this.showContent();
        
        let message = 'この画像にはEXIF情報が含まれていません。';
        
        if (fileType === 'image/png') {
            message += '\n\nPNG形式は通常EXIF情報を保存しません。';
        }

        // 各テーブルにメッセージを表示
        const tables = ['basic-table', 'camera-table', 'settings-table', 'gps-table', 'other-table'];
        tables.forEach(tableId => {
            const table = document.getElementById(tableId);
            table.innerHTML = '';
            const row = table.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 2;
            cell.textContent = message;
            cell.className = 'no-data';
            cell.style.textAlign = 'center';
            cell.style.padding = '30px';
            cell.style.whiteSpace = 'pre-line';
        });

        // 生データも空に
        document.getElementById('raw-data').textContent = '{}';
    }
}
