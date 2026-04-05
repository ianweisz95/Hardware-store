"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi, posApi, paymentApi } from "@/lib/api";
import { useCartStore, useAuthStore } from "@/store";
import toast from "react-hot-toast";
import {
  Search, Plus, Minus, Trash2, CreditCard, Banknote,
  Smartphone, Barcode, ShoppingCart, X, ReceiptText,
  RefreshCw, CheckCircle, Clock, Loader2, ChevronRight,
  Package,
} from "lucide-react";
import clsx from "clsx";

// ─── Receipt Component ────────────────────────────────────────────────────────
function Receipt({ order }: { order: any }) {
  return (
    <div className="receipt p-4 text-xs font-mono" style={{ width: "80mm" }}>
      <div className="text-center mb-2">
        <p className="font-bold text-base">HARDWARE STORE</p>
        <p>Nairobi, Kenya</p>
        <p>Tel: +254 700 000 000</p>
        <p className="border-t border-dashed mt-2 pt-2">{new Date().toLocaleString("en-KE")}</p>
        <p>Order: {order.orderNumber}</p>
        <p>Cashier: {order.cashier?.name || "—"}</p>
      </div>
      <div className="border-t border-dashed my-2" />
      {order.items.map((item: any, i: number) => (
        <div key={i} className="flex justify-between gap-2 mb-1">
          <div className="flex-1">
            <p>{item.name}</p>
            <p>{item.quantity} x {item.unitPrice.toLocaleString()}</p>
          </div>
          <p>{item.total.toLocaleString()}</p>
        </div>
      ))}
      <div className="border-t border-dashed my-2" />
      <div className="flex justify-between"><span>Subtotal:</span><span>KES {order.subtotal?.toLocaleString()}</span></div>
      {order.discountAmount > 0 && <div className="flex justify-between"><span>Discount:</span><span>-KES {order.discountAmount?.toLocaleString()}</span></div>}
      <div className="flex justify-between"><span>VAT (16%):</span><span>KES {Math.round(order.taxAmount || 0).toLocaleString()}</span></div>
      <div className="flex justify-between font-bold text-sm border-t border-dashed pt-2 mt-1">
        <span>TOTAL:</span><span>KES {order.total?.toLocaleString()}</span>
      </div>
      {order.amountPaid > 0 && <div className="flex justify-between"><span>Paid:</span><span>KES {order.amountPaid?.toLocaleString()}</span></div>}
      {order.change > 0 && <div className="flex justify-between"><span>Change:</span><span>KES {order.change?.toLocaleString()}</span></div>}
      <div className="text-center mt-3 border-t border-dashed pt-2">
        <p>Payment: {order.paymentMethod?.toUpperCase()}</p>
        {order.payments?.[0]?.reference && <p>Ref: {order.payments[0].reference}</p>}
        <p className="mt-2">Thank you for shopping with us!</p>
        <p>Powered by HardwarePro</p>
      </div>
    </div>
  );
}

// ─── M-Pesa Dialog ────────────────────────────────────────────────────────────
function MpesaDialog({ total, onSuccess, onClose }: { total: number; onSuccess: () => void; onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "polling" | "done" | "failed">("idle");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initiate = async () => {
    if (!phone.match(/^(\+254|0)[17]\d{8}$/)) {
      toast.error("Enter a valid Kenyan phone number");
      return;
    }
    setStatus("sending");
    try {
      const res = await paymentApi.initiateMpesa({ phone, amount: total });
      setPaymentId(res.data.data.paymentId);
      setStatus("polling");
      toast.success("Check your phone for M-Pesa prompt");
      startPolling(res.data.data.paymentId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send STK push");
      setStatus("failed");
    }
  };

  const startPolling = (pid: string) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await paymentApi.queryStatus(pid);
        const s = res.data.data.status;
        if (s === "completed") {
          clearInterval(pollRef.current!);
          setStatus("done");
          toast.success("Payment received!");
          setTimeout(onSuccess, 1500);
        } else if (s === "failed" || s === "cancelled") {
          clearInterval(pollRef.current!);
          setStatus("failed");
          toast.error("Payment failed or cancelled");
        }
      } catch {}
      if (attempts >= 24) { // 2 min timeout
        clearInterval(pollRef.current!);
        setStatus("failed");
      }
    }, 5000);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">M-Pesa Payment</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="bg-green-50 rounded-xl p-4 text-center mb-6">
          <p className="text-sm text-green-700">Amount to pay</p>
          <p className="text-3xl font-bold text-green-800">KES {total.toLocaleString()}</p>
        </div>

        {status === "idle" && (
          <>
            <input
              className="input mb-4"
              placeholder="Phone: 0712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
            />
            <button onClick={initiate} className="btn-success w-full">
              <Smartphone className="w-4 h-4" /> Send STK Push
            </button>
          </>
        )}

        {status === "sending" && (
          <div className="text-center py-4">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Sending STK Push...</p>
          </div>
        )}

        {status === "polling" && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-3 flex items-center justify-center pulse-ring">
              <Smartphone className="w-8 h-8 text-green-600" />
            </div>
            <p className="font-medium text-gray-900">Waiting for payment...</p>
            <p className="text-sm text-gray-500 mt-1">Check {phone} for the prompt</p>
            <div className="flex items-center justify-center gap-1 mt-3 text-xs text-gray-400">
              <Clock className="w-3 h-3" /> Checking every 5 seconds
            </div>
          </div>
        )}

        {status === "done" && (
          <div className="text-center py-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-2" />
            <p className="font-medium text-green-700">Payment Received!</p>
          </div>
        )}

        {status === "failed" && (
          <div className="text-center py-4">
            <X className="w-16 h-16 text-red-500 mx-auto mb-2" />
            <p className="font-medium text-red-700">Payment Failed</p>
            <button onClick={() => setStatus("idle")} className="btn-secondary mt-3 mx-auto">Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main POS Page ────────────────────────────────────────────────────────────
export default function POSPage() {
  const [search, setSearch] = useState("");
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [showMpesa, setShowMpesa] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const receiptRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const cart = useCartStore();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: productsData, isFetching } = useQuery({
    queryKey: ["pos-products", search],
    queryFn: () => productApi.getAll({ search, limit: 20, branchId: user?.branch }).then((r) => r.data.data),
    enabled: search.length >= 1,
  });

  const saleMutation = useMutation({
    mutationFn: (data: any) => posApi.createSale(data),
    onSuccess: (res) => {
      setCompletedOrder(res.data.data.order);
      cart.clearCart();
      setDiscount(0);
      setCashReceived("");
      qc.invalidateQueries({ queryKey: ["daily-summary"] });
      if (cart.paymentMethod !== "mpesa") toast.success("Sale completed!");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Sale failed"),
  });

  const handleBarcodeSearch = useCallback(async (barcode: string) => {
    try {
      const res = await productApi.getByBarcode(barcode);
      cart.addItem(res.data.data.product);
      setSearch("");
      toast.success(`Added: ${res.data.data.product.name}`);
    } catch {
      toast.error("Product not found");
    }
  }, [cart]);

  useEffect(() => {
    if (barcodeMode && search.length > 8 && !search.includes(" ")) {
      handleBarcodeSearch(search);
    }
  }, [search, barcodeMode, handleBarcodeSearch]);

  const checkout = () => {
    if (cart.items.length === 0) return toast.error("Cart is empty");

    const saleData = {
      items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      paymentMethod: cart.paymentMethod,
      discountAmount: discount,
      customerName: cart.customerName,
      customerPhone: cart.customerPhone,
      cashReceived: cart.paymentMethod === "cash" ? Number(cashReceived) : undefined,
    };

    if (cart.paymentMethod === "mpesa") {
      setShowMpesa(true);
    } else {
      saleMutation.mutate(saleData);
    }
  };

  const handleMpesaSuccess = () => {
    setShowMpesa(false);
    saleMutation.mutate({
      items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      paymentMethod: "mpesa",
      discountAmount: discount,
    });
  };

  const printReceipt = () => {
    if (!receiptRef.current) return;
    const receiptContent = receiptRef.current.innerHTML;
    const win = window.open("", "_blank", "width=420,height=650");
    if (!win) { toast.error("Please allow popups to print receipts"); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt - ${completedOrder?.orderNumber || ''}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 16px; color: #000; background: #fff; }
        .receipt { width: 100%; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 700; }
        .text-base { font-size: 14px; }
        .text-sm { font-size: 11px; }
        .border-t { border-top: 1px dashed #000; }
        .border-dashed { border-style: dashed; }
        .my-2 { margin: 6px 0; }
        .mb-1 { margin-bottom: 4px; }
        .mb-2 { margin-bottom: 8px; }
        .mt-1 { margin-top: 4px; }
        .mt-2 { margin-top: 8px; }
        .mt-3 { margin-top: 12px; }
        .pt-2 { padding-top: 8px; }
        .p-4 { padding: 16px; }
        .gap-2 { gap: 8px; }
        .flex-1 { flex: 1; }
        p { margin: 2px 0; }
        @media print {
          body { padding: 0; }
          @page { margin: 8mm; size: 80mm auto; }
        }
      </style></head>
      <body>${receiptContent}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.addEventListener('afterprint', () => { win.close(); setCompletedOrder(null); });
    }, 600);
  };

  const downloadReceipt = () => {
    if (!receiptRef.current || !completedOrder) return;
    const receiptContent = receiptRef.current.innerHTML;
    const html = `<!DOCTYPE html><html><head><title>Receipt-${completedOrder.orderNumber}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 16px; color: #000; }
        .flex { display: flex; } .justify-between { justify-content: space-between; }
        .text-center { text-align: center; } .font-bold { font-weight: 700; }
        .text-base { font-size: 14px; } .border-t { border-top: 1px dashed #000; }
        .my-2 { margin: 6px 0; } .mb-1 { margin-bottom: 4px; } .mt-3 { margin-top: 12px; }
        .pt-2 { padding-top: 8px; } .gap-2 { gap: 8px; } .flex-1 { flex: 1; } p { margin: 2px 0; }
      </style></head><body>${receiptContent}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${completedOrder.orderNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const subtotal = cart.subtotal();
  const total = subtotal - discount;
  const change = cart.paymentMethod === "cash" ? Math.max(0, Number(cashReceived) - total) : 0;

  return (
    <div className="flex h-[calc(100vh-128px)] gap-4 animate-fade-in">
      {/* Left: Product search */}
      <div className="flex-1 flex flex-col card overflow-hidden">
        {/* Search bar */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex gap-2">
            <div className="relative flex-1">
              {barcodeMode ? (
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              )}
              <input
                ref={searchRef}
                className={clsx("input pl-9", barcodeMode && "border-orange-400 ring-1 ring-orange-400")}
                placeholder={barcodeMode ? "Scan barcode..." : "Search products by name or SKU..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              {isFetching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
            </div>
            <button
              onClick={() => { setBarcodeMode(!barcodeMode); setSearch(""); searchRef.current?.focus(); }}
              className={clsx("btn", barcodeMode ? "bg-orange-100 text-orange-700 border border-orange-300" : "btn-secondary")}
              title="Toggle barcode mode"
            >
              <Barcode className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {search.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {(productsData || []).map((product: any) => (
                <button
                  key={product._id}
                  onClick={() => { cart.addItem(product); setSearch(""); searchRef.current?.focus(); }}
                  className="card p-3 text-left hover:border-primary-400 hover:shadow-md transition-all group"
                >
                  <div className="w-full h-20 bg-gray-100 rounded-lg mb-2 flex items-center justify-center group-hover:bg-primary-50 transition-colors">
                    <Package className="w-8 h-8 text-gray-300 group-hover:text-primary-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sku}</p>
                  <p className="text-sm font-bold text-primary-600 mt-1">
                    KES {(product.effectivePrice || product.price)?.toLocaleString()}
                  </p>
                </button>
              ))}
              {productsData?.length === 0 && (
                <div className="col-span-3 text-center py-16 text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No products found</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <ShoppingCart className="w-16 h-16 mb-3" />
              <p className="text-lg">Search or scan to add products</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-96 flex flex-col card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" /> Cart
            {cart.items.length > 0 && (
              <span className="badge badge-blue">{cart.items.length}</span>
            )}
          </h2>
          {cart.items.length > 0 && (
            <button onClick={cart.clearCart} className="btn-ghost btn-sm text-red-500 hover:bg-red-50">
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <ShoppingCart className="w-12 h-12 mb-2" />
              <p className="text-sm">Cart is empty</p>
            </div>
          ) : (
            cart.items.map((item) => (
              <div key={item.productId} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        className="w-20 text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-400"
                        value={item.unitPrice}
                        onChange={(e) => cart.updatePrice(item.productId, Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <button onClick={() => cart.removeItem(item.productId)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => item.quantity > 1 ? cart.updateQty(item.productId, item.quantity - 1) : cart.removeItem(item.productId)}
                      className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-200 text-gray-600"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => cart.updateQty(item.productId, item.quantity + 1)}
                      className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white hover:bg-primary-700"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-gray-900">KES {item.total.toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & checkout */}
        <div className="border-t border-gray-100 p-4 space-y-3">
          {/* Customer */}
          <div className="flex gap-2">
            <input className="input text-xs" placeholder="Customer name" value={cart.customerName} onChange={(e) => cart.setCustomer(e.target.value, cart.customerPhone)} />
            <input className="input text-xs" placeholder="Phone" value={cart.customerPhone} onChange={(e) => cart.setCustomer(cart.customerName, e.target.value)} />
          </div>

          {/* Discount */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-20 flex-shrink-0">Discount KES</label>
            <input type="number" className="input text-sm" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} placeholder="0" min="0" />
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>KES {subtotal.toLocaleString()}</span></div>
            {discount > 0 && <div className="flex justify-between text-orange-600"><span>Discount</span><span>-KES {discount.toLocaleString()}</span></div>}
            <div className="flex justify-between font-bold text-base text-gray-900 pt-1 border-t border-gray-200">
              <span>Total</span><span>KES {total.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { method: "cash", icon: Banknote, label: "Cash" },
              { method: "mpesa", icon: Smartphone, label: "M-Pesa" },
              { method: "credit", icon: CreditCard, label: "Credit" },
            ].map(({ method, icon: Icon, label }) => (
              <button
                key={method}
                onClick={() => cart.setPaymentMethod(method as any)}
                className={clsx(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border-2 text-xs font-medium transition-all",
                  cart.paymentMethod === method
                    ? "border-primary-600 bg-primary-50 text-primary-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Cash received */}
          {cart.paymentMethod === "cash" && (
            <div>
              <input
                type="number"
                className="input"
                placeholder="Cash received"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
              />
              {Number(cashReceived) > 0 && (
                <p className="text-sm text-green-600 mt-1 font-medium">Change: KES {change.toLocaleString()}</p>
              )}
            </div>
          )}

          {/* Checkout button */}
          <button
            onClick={checkout}
            disabled={cart.items.length === 0 || saleMutation.isPending}
            className="btn-primary w-full btn-lg"
          >
            {saleMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              <><ChevronRight className="w-4 h-4" /> Complete Sale — KES {total.toLocaleString()}</>
            )}
          </button>
        </div>
      </div>

      {/* M-Pesa dialog */}
      {showMpesa && (
        <MpesaDialog
          total={total}
          onSuccess={handleMpesaSuccess}
          onClose={() => setShowMpesa(false)}
        />
      )}

      {/* Completed order receipt */}
      {completedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <h3 className="font-bold text-gray-900">Sale Complete!</h3>
              <p className="text-sm text-gray-500">{completedOrder.orderNumber}</p>
            </div>
            <div style={{position:"absolute",left:"-9999px",top:0}} ref={receiptRef}>
              <Receipt order={completedOrder} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCompletedOrder(null)} className="btn-secondary flex-1">
                <RefreshCw className="w-4 h-4" /> New Sale
              </button>
              <button onClick={printReceipt} className="btn-primary flex-1">
                <ReceiptText className="w-4 h-4" /> Print Receipt
              </button>
            </div>
            <button onClick={downloadReceipt} className="btn-secondary w-full mt-2 text-xs">
              Download Receipt (HTML)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
