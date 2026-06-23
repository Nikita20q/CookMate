package smartfridge.parser.utils;

import java.util.regex.Pattern;

public final class SlugUtil {

    private static final Pattern NON_LATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]+");

    private SlugUtil() {}

    public static String generateSlug(String title, Long recipeId) {
        if (title == null || title.isEmpty()) {
            return "recipe-" + recipeId;
        }

        String translit = transliterate(title.toLowerCase());

        String slug = WHITESPACE.matcher(translit).replaceAll("-");
        slug = NON_LATIN.matcher(slug).replaceAll("");
        slug = slug.replaceAll("^-+|-+$", "");
        slug = slug.replaceAll("-+", "-");

        if (slug.isEmpty()) {
            slug = "recipe";
        }

        return recipeId + "-" + slug;
    }

    public static Long extractIdFromUrl(String url) {
        if (url == null) return null;
        try {
            String[] parts = url.split("/");
            String last = parts[parts.length - 1];
            int dashIndex = last.indexOf('-');
            if (dashIndex > 0) {
                return Long.parseLong(last.substring(0, dashIndex));
            }
        } catch (NumberFormatException ignored) {
        }
        return null;
    }

    private static String transliterate(String text) {
        StringBuilder sb = new StringBuilder(text.length());
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            switch (c) {
                case 'а': sb.append('a'); break;
                case 'б': sb.append('b'); break;
                case 'в': sb.append('v'); break;
                case 'г': sb.append('g'); break;
                case 'д': sb.append('d'); break;
                case 'е': sb.append('e'); break;
                case 'ё': sb.append("yo"); break;
                case 'ж': sb.append("zh"); break;
                case 'з': sb.append('z'); break;
                case 'и': sb.append('i'); break;
                case 'й': sb.append('y'); break;
                case 'к': sb.append('k'); break;
                case 'л': sb.append('l'); break;
                case 'м': sb.append('m'); break;
                case 'н': sb.append('n'); break;
                case 'о': sb.append('o'); break;
                case 'п': sb.append('p'); break;
                case 'р': sb.append('r'); break;
                case 'с': sb.append('s'); break;
                case 'т': sb.append('t'); break;
                case 'у': sb.append('u'); break;
                case 'ф': sb.append('f'); break;
                case 'х': sb.append('h'); break;
                case 'ц': sb.append("ts"); break;
                case 'ч': sb.append("ch"); break;
                case 'ш': sb.append("sh"); break;
                case 'щ': sb.append("sch"); break;
                case 'ъ': sb.append(""); break;
                case 'ы': sb.append('y'); break;
                case 'ь': sb.append(""); break;
                case 'э': sb.append('e'); break;
                case 'ю': sb.append("yu"); break;
                case 'я': sb.append("ya"); break;
                case ' ': sb.append(' '); break;
                case '-': sb.append('-'); break;
                default:
                    if (Character.isLetterOrDigit(c)) {
                        sb.append(c);
                    }
                    break;
            }
        }
        return sb.toString();
    }
}