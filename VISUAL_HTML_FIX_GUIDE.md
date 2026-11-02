# Visual Guide - Index.html Modification

## CURRENT STATE (WRONG ❌)
```html
...
				</div>
			</div>
		</div>
	</div>
</body>
</html>
```

## NEW STATE (CORRECT ✅)
```html
...
				</div>
			</div>
		</div>
	</div>

	<script src="script.js"></script>
	<script src="script-cart-functions.js"></script>
</body>
</html>
```

## Summary of Change
- **Location**: At the very end of `index.html`, before `</body>`
- **Add**: Two `<script>` tags
- **Order**: `script.js` FIRST, then `script-cart-functions.js`
- **After**: Rebuild solution and test

## File Paths (Confirm These Are Correct)
```
Food.Web/
├── wwwroot/
│   ├── index.html                 ← File to edit
│   ├── script.js                  ← Main script (already exists)
│   ├── script-cart-functions.js   ← NEW script file (already created)
│   └── style.css                  ← Styles (no changes)
```

## Validation Checklist
- [ ] Opened `Food.Web\wwwroot\index.html`
- [ ] Found the end of the file before `</body>`
- [ ] Added `<script src="script.js"></script>`
- [ ] Added `<script src="script-cart-functions.js"></script>`
- [ ] Saved the file
- [ ] Rebuilt solution
- [ ] Cleared browser cache
- [ ] Tested by adding item to cart
- [ ] Verified cart shows the item

## Expected Result After Change
When you:
1. Login
2. Click a restaurant
3. Click "Add to Cart" on a menu item

You should see:
- ✅ Toast notification: "✓ Item added to cart!"
- ✅ Cart button shows cart count
- ✅ Item appears in Cart view
- ✅ Can update quantity
- ✅ Can remove item
- ✅ Can checkout

---

**That's it! Just these 2 lines fix the entire cart system.**
