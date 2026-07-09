import XCTest

// MARK: - XCUIElement Extensions

extension XCUIElement {
    /// Check if element is displayed (exists and is hittable)
    var isDisplayed: Bool {
        return self.exists && self.isHittable
    }
    
    /// Tap element with a small delay to ensure responsiveness
    func tapSafely() {
        if self.isDisplayed {
            self.tap()
            Thread.sleep(forTimeInterval: 0.3)
        }
    }
    
    /// Get element text value
    var textValue: String {
        return (self.value as? String) ?? ""
    }

    func clearAndEnterText(text: String) {
      guard let currentValue = self.value as? String else {
        XCTFail("Cannot clear element without a value")
        return
      }

      // focus the element
      self.tap()

      // creates string of delete characters to clear the current value
      let deleteString = String(repeating: XCUIKeyboardKey.delete.rawValue, count: currentValue.count)

      self.typeText(deleteString)
      self.typeText(text)
    }
}

// MARK: - XCUIApplication Extensions

extension XCUIApplication {
    /// Move app to background and foreground to simulate user switching apps
    func toggleBackgroundAndForeground(duration: TimeInterval = 1.0) {
        XCUIDevice.shared.press(.home)
        Thread.sleep(forTimeInterval: duration)
        self.activate()
        Thread.sleep(forTimeInterval: 0.5)
    }
}

// MARK: - XCUIElementQuery Extensions

extension XCUIElementQuery {
    /// Find element containing exact text
    /// - parameter text: The exact text to search for
    /// - returns: First matching element
    func element(withExactText text: String) -> XCUIElement {
        return self.element(matching: NSPredicate(format: "label == %@", text))
    }
    
    /// Find element containing partial text
    /// - parameter text: Partial text to search for
    /// - returns: First matching element
    func element(containingText text: String) -> XCUIElement {
        return self.element(matching: NSPredicate(format: "label CONTAINS %@", text))
    }
}

// MARK: - Wait Utilities

class XCTestWait {
    /// Wait for condition to be true with timeout
    /// - parameter timeout: Maximum time to wait in seconds
    /// - parameter condition: Closure that returns true when condition is met
    static func waitFor(timeout: TimeInterval = 5, condition: @escaping () -> Bool) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        var attempt = 0
        let maxAttempts = Int(timeout * 10)
        
        while Date() < deadline && attempt < maxAttempts {
            if condition() {
                return true
            }
            Thread.sleep(forTimeInterval: 0.1)
            attempt += 1
        }
        
        return condition()
    }
    
    /// Wait for element to exist
    /// - parameter element: Element to wait for
    /// - parameter timeout: Maximum time to wait in seconds
    static func waitForElement(
        _ element: XCUIElement,
        timeout: TimeInterval = 5,
        message: String? = nil
    ) -> Bool {
        let result = element.waitForExistence(timeout: timeout)
        if !result, let msg = message {
            XCTFail("\(msg) - Element did not exist after \(timeout)s")
        }
        return result
    }
}
