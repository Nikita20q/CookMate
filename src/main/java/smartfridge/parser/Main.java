package smartfridge.parser;


public class Main {
    public static void main(String[] args) {
        ThousandMenuParser linkParser = new ThousandMenuParser();
//        linkParser.parseAllPages("https://1000.menu/catalog/drugoe", 2);
        for (var i : linkParser.parseAllPages("https://1000.menu/catalog/drugoe", 2)) {
            System.out.println(i);
        }
    }
}