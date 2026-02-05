import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const provider = new PaymentTrackerProvider(context.extensionUri, context);

    const disposable = vscode.commands.registerCommand('paymentTracker.open', () => {
        PaymentTrackerPanel.createOrShow(context.extensionUri, context);
    });

    context.subscriptions.push(disposable);
}

class PaymentTrackerProvider {
    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) { }
}

class PaymentTrackerPanel {
    public static currentPanel: PaymentTrackerPanel | undefined;
    public static readonly viewType = 'paymentTracker';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _context: vscode.ExtensionContext;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (PaymentTrackerPanel.currentPanel) {
            PaymentTrackerPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            PaymentTrackerPanel.viewType,
            'Payment Tracker',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media')
                ]
            }
        );

        PaymentTrackerPanel.currentPanel = new PaymentTrackerPanel(panel, extensionUri, context);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._context = context;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'savePayment':
                        await this.savePayment(message.payment);
                        break;
                    case 'deletePayment':
                        await this.deletePayment(message.id);
                        break;
                    case 'loadPayments':
                        await this.loadPayments();
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private async savePayment(payment: Payment) {
        const payments = this._context.workspaceState.get<Payment[]>('payments', []);
        if (payment.id) {
            const index = payments.findIndex(p => p.id === payment.id);
            if (index !== -1) {
                payments[index] = payment;
            }
        } else {
            payment.id = Date.now().toString();
            payments.push(payment);
        }
        await this._context.workspaceState.update('payments', payments);
        await this.loadPayments();
    }

    private async deletePayment(id: string) {
        const payments = this._context.workspaceState.get<Payment[]>('payments', []);
        const filtered = payments.filter(p => p.id !== id);
        await this._context.workspaceState.update('payments', filtered);
        await this.loadPayments();
    }

    private async loadPayments() {
        const payments = this._context.workspaceState.get<Payment[]>('payments', []);
        this._panel.webview.postMessage({
            command: 'updatePayments',
            payments: payments
        });
    }

    public dispose() {
        PaymentTrackerPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
        this.loadPayments();
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Tracker</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        h1 {
            margin-bottom: 20px;
            color: var(--vscode-textLink-foreground);
        }
        
        .payments-list {
            margin-bottom: 30px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            background-color: var(--vscode-editor-background);
        }
        
        .payment-item {
            padding: 15px;
            margin-bottom: 15px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            background-color: var(--vscode-sideBar-background);
        }
        
        .payment-item:last-child {
            margin-bottom: 0;
        }
        
        .payment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .payment-title {
            font-weight: bold;
            font-size: 16px;
        }
        
        .payment-amount {
            font-size: 18px;
            color: var(--vscode-textLink-foreground);
            font-weight: bold;
        }
        
        .payment-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin-bottom: 10px;
            font-size: 13px;
        }
        
        .payment-detail {
            color: var(--vscode-descriptionForeground);
        }
        
        .payment-detail strong {
            color: var(--vscode-foreground);
        }
        
        .timeline {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        
        .timeline-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: var(--vscode-foreground);
        }
        
        .timeline-items {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .timeline-item {
            padding: 6px 12px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-radius: 4px;
            font-size: 12px;
            border: 1px solid var(--vscode-button-border);
        }
        
        .timeline-item.past {
            opacity: 0.6;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .timeline-item.today {
            background-color: var(--vscode-textLink-foreground);
            font-weight: bold;
        }
        
        .delete-btn {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .delete-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .form-container {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 20px;
            background-color: var(--vscode-sideBar-background);
        }
        
        .form-title {
            margin-bottom: 20px;
            font-size: 18px;
            font-weight: bold;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-size: 13px;
            color: var(--vscode-foreground);
        }
        
        input, select, textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: 13px;
        }
        
        input:focus, select:focus, textarea:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }
        
        textarea {
            resize: vertical;
            min-height: 60px;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .submit-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: 1px solid var(--vscode-button-border);
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            width: 100%;
        }
        
        .submit-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Payment Tracker</h1>
        
        <div class="payments-list">
            <h2 style="margin-bottom: 15px;">Payment Timeline</h2>
            <div id="payments-container">
                <div class="empty-state">No payments added yet. Add your first payment below.</div>
            </div>
        </div>
        
        <div class="form-container">
            <div class="form-title">Add New Payment</div>
            <form id="payment-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="date">Date</label>
                        <input type="date" id="date" name="date" required>
                    </div>
                    <div class="form-group">
                        <label for="amount">Amount</label>
                        <input type="number" id="amount" name="amount" step="0.01" min="0" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="firstPaymentDate">First Payment Date</label>
                        <input type="date" id="firstPaymentDate" name="firstPaymentDate" required>
                    </div>
                    <div class="form-group">
                        <label for="occurrence">Occurrence</label>
                        <select id="occurrence" name="occurrence" required>
                            <option value="once">Once</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Bi-weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="description">Description</label>
                    <textarea id="description" name="description" rows="3"></textarea>
                </div>
                
                <div class="form-group">
                    <label for="person">Person</label>
                    <input type="text" id="person" name="person">
                </div>
                
                <button type="submit" class="submit-btn">Add Payment</button>
            </form>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        let payments = [];
        
        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        }
        
        function formatCurrency(amount) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(amount);
        }
        
        function getOccurrenceLabel(occurrence) {
            const labels = {
                'once': 'Once',
                'daily': 'Daily',
                'weekly': 'Weekly',
                'biweekly': 'Bi-weekly',
                'monthly': 'Monthly',
                'quarterly': 'Quarterly',
                'yearly': 'Yearly'
            };
            return labels[occurrence] || occurrence;
        }
        
        function calculateTimeline(firstPaymentDate, occurrence, date) {
            const timeline = [];
            const startDate = new Date(firstPaymentDate);
            const endDate = new Date(date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (occurrence === 'once') {
                timeline.push(startDate);
            } else {
                let currentDate = new Date(startDate);
                
                while (currentDate <= endDate) {
                    timeline.push(new Date(currentDate));
                    
                    switch (occurrence) {
                        case 'daily':
                            currentDate.setDate(currentDate.getDate() + 1);
                            break;
                        case 'weekly':
                            currentDate.setDate(currentDate.getDate() + 7);
                            break;
                        case 'biweekly':
                            currentDate.setDate(currentDate.getDate() + 14);
                            break;
                        case 'monthly':
                            currentDate.setMonth(currentDate.getMonth() + 1);
                            break;
                        case 'quarterly':
                            currentDate.setMonth(currentDate.getMonth() + 3);
                            break;
                        case 'yearly':
                            currentDate.setFullYear(currentDate.getFullYear() + 1);
                            break;
                    }
                }
            }
            
            return timeline.map(d => {
                const dateStr = d.toISOString().split('T')[0];
                const dateObj = new Date(d);
                dateObj.setHours(0, 0, 0, 0);
                
                let className = 'timeline-item';
                if (dateObj < today) {
                    className += ' past';
                } else if (dateObj.getTime() === today.getTime()) {
                    className += ' today';
                }
                
                return { date: dateStr, className };
            });
        }
        
        function renderPayments() {
            const container = document.getElementById('payments-container');
            
            if (payments.length === 0) {
                container.innerHTML = '<div class="empty-state">No payments added yet. Add your first payment below.</div>';
                return;
            }
            
            container.innerHTML = payments.map(payment => {
                const timeline = calculateTimeline(payment.firstPaymentDate, payment.occurrence, payment.date);
                
                return \`
                    <div class="payment-item">
                        <div class="payment-header">
                            <div class="payment-title">\${payment.description || 'Payment'}</div>
                            <div class="payment-amount">\${formatCurrency(payment.amount)}</div>
                        </div>
                        <div class="payment-details">
                            <div class="payment-detail">
                                <strong>Date:</strong> \${formatDate(payment.date)}
                            </div>
                            <div class="payment-detail">
                                <strong>First Payment:</strong> \${formatDate(payment.firstPaymentDate)}
                            </div>
                            <div class="payment-detail">
                                <strong>Occurrence:</strong> \${getOccurrenceLabel(payment.occurrence)}
                            </div>
                            \${payment.person ? \`<div class="payment-detail"><strong>Person:</strong> \${payment.person}</div>\` : ''}
                        </div>
                        <div class="timeline">
                            <div class="timeline-title">Payment Schedule:</div>
                            <div class="timeline-items">
                                \${timeline.map(item => 
                                    \`<span class="\${item.className}" title="\${formatDate(item.date)}">\${formatDate(item.date)}</span>\`
                                ).join('')}
                            </div>
                        </div>
                        <button class="delete-btn" onclick="deletePayment('\${payment.id}')" style="margin-top: 10px;">Delete</button>
                    </div>
                \`;
            }).join('');
        }
        
        function deletePayment(id) {
            if (confirm('Are you sure you want to delete this payment?')) {
                vscode.postMessage({
                    command: 'deletePayment',
                    id: id
                });
            }
        }
        
        document.getElementById('payment-form').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const payment = {
                date: formData.get('date'),
                amount: parseFloat(formData.get('amount')),
                firstPaymentDate: formData.get('firstPaymentDate'),
                occurrence: formData.get('occurrence'),
                description: formData.get('description'),
                person: formData.get('person')
            };
            
            vscode.postMessage({
                command: 'savePayment',
                payment: payment
            });
            
            e.target.reset();
        });
        
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'updatePayments':
                    payments = message.payments || [];
                    renderPayments();
                    break;
            }
        });
        
        // Load payments on startup
        vscode.postMessage({
            command: 'loadPayments'
        });
    </script>
</body>
</html>`;
    }
}

interface Payment {
    id?: string;
    date: string;
    amount: number;
    firstPaymentDate: string;
    occurrence: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
    description: string;
    person: string;
}

export function deactivate() {}
